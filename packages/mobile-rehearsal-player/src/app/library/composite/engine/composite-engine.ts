import {
  COMPOSITE_OVERLAP_SAMPLES,
  createWindowedVoice,
  type SyncTimers,
  type VoiceGain,
  type WindowedVoice,
} from '@org/audio-mixing';

import type {
  CompositeEngine,
  CompositeEngineOptions,
  CompositeEngineState,
  EngineContext,
  EngineLoop,
  EngineStem,
} from './composite-engine-types';

/**
 * The Web Audio engine of a composite (composite-tracks design Decision 4): per
 * stem a windowed voice into a stem gain, all into one sum bus, then the pitch
 * stage when the sum is shaped, the mix limiter, a master gain and the output.
 * The `AudioContext` clock is the only clock. Playing from a position schedules
 * every voice at the same context time, so stems cannot drift from one another
 * by construction. The context, pitch stage and limiter come in as
 * dependencies, so the scheduling is specced with fakes and the browser wiring
 * stays in `create-web-composite-engine.web.ts`.
 */

/** Context time between pressing play and the sound, so all voices begin on one instant. */
export const ENGINE_START_LEAD_S = 0.05;
/** A gain change ramps over this long, so a slider drag or a mute never clicks. */
export const GAIN_RAMP_S = 0.02;
const ENDED_POLL_MS = 100;
/** How far before the loop end the wrap is scheduled, so the voices read the loop start first. */
const LOOP_LOOKAHEAD_S = 0.4;
const MS_PER_SECOND = 1000;
const NEUTRAL_RATE = 1;
const NO_PITCH = 0;

export type {
  CompositeEngine,
  CompositeEngineOptions,
  CompositeEngineState,
  EngineContext,
  EngineLoop,
  EngineStem,
  PitchStage,
} from './composite-engine-types';

type StemSlot = { stem: EngineStem; gain: VoiceGain; voice: WindowedVoice };

const defaultTimers: SyncTimers = {
  setInterval: (callback, ms) => globalThis.setInterval(callback, ms),
  clearInterval: (handle) =>
    globalThis.clearInterval(handle as ReturnType<typeof setInterval>),
};

const rampGain = (context: EngineContext, node: VoiceGain, target: number) => {
  const now = context.currentTime;

  node.gain.setValueAtTime(node.gain.value, now);
  node.gain.linearRampToValueAtTime(target, now + GAIN_RAMP_S);
};

export const createCompositeEngine = (
  options: CompositeEngineOptions,
): CompositeEngine => {
  const { context, limiter } = options;
  const pitchStage = options.pitchStage ?? null;
  const timers = options.timers ?? defaultTimers;
  const listeners = new Set<() => void>();
  const durationMs = Math.max(
    0,
    ...options.stems.map((stem) =>
      Math.max(0, stem.offsetMs + stem.reader.durationMs),
    ),
  );
  const sum = context.createGain();
  const dry = context.createGain();
  const wet = context.createGain();
  const master = context.createGain();
  const createVoice =
    options.createVoice ??
    ((output, reader, onUnavailable) =>
      createWindowedVoice({
        context,
        output,
        reader,
        overlapSamples: COMPOSITE_OVERLAP_SAMPLES,
        onUnavailable,
      }));

  let state: CompositeEngineState = 'paused';
  let rate = NEUTRAL_RATE;
  let volume = 1;
  let pitchSemitones = NO_PITCH;
  // The clock: media position `anchorMs` at context time `anchorTime`, moving at `rate`.
  let anchorMs = 0;
  let anchorTime = 0;
  let disposed = false;
  let loop: EngineLoop | null = null;
  // While a wrap is scheduled the clock describes the loop start in the future;
  // `before` keeps the clock that is still sounding until then.
  let wrap: { at: number; before: { ms: number; time: number } } | null = null;

  const slots: StemSlot[] = options.stems.map((stem) => {
    const gain = context.createGain();
    const voice = createVoice(gain, stem.reader, (error) =>
      options.onStemUnavailable?.(stem.id, error),
    );

    gain.gain.value = options.initialGains?.[stem.id] ?? 1;
    gain.connect(sum);

    return { stem, gain, voice };
  });

  sum.connect(dry);
  dry.connect(limiter.input);

  if (pitchStage) {
    sum.connect(pitchStage.input);
    pitchStage.output.connect(wet);
    wet.connect(limiter.input);
  }

  limiter.output.connect(master);
  master.connect(context.destination);
  wet.gain.value = 0;

  const notify = () => listeners.forEach((listener) => listener());

  const positionAt = (time: number) => {
    if (wrap && time < wrap.at) {
      return Math.min(
        loop?.endMs ?? durationMs,
        wrap.before.ms +
          Math.max(0, time - wrap.before.time) * MS_PER_SECOND * rate,
      );
    }

    return Math.min(
      durationMs,
      anchorMs + Math.max(0, time - anchorTime) * MS_PER_SECOND * rate,
    );
  };

  const getPositionMs = () => {
    return state === 'playing' ? positionAt(context.currentTime) : anchorMs;
  };

  const isShaped = () => rate !== NEUTRAL_RATE || pitchSemitones !== NO_PITCH;

  /** The shaped path carries the sum while the speed or pitch is off neutral. */
  const applyShapePath = () => {
    if (!pitchStage) {
      return;
    }

    const shaped = isShaped();

    pitchStage.update({ rate, pitchSemitones });
    rampGain(context, dry, shaped ? 0 : 1);
    rampGain(context, wet, shaped ? 1 : 0);
  };

  const stopVoices = () => slots.forEach(({ voice }) => voice.stop());

  /** Starts every voice on one context time from the composite position `positionMs`. */
  const startVoices = (
    positionMs: number,
    when: number = context.currentTime + ENGINE_START_LEAD_S,
  ) => {
    wrap = null;
    anchorMs = positionMs;
    anchorTime = when;

    for (const { stem, voice } of slots) {
      voice.setRate(rate);

      const stemMs = positionMs - stem.offsetMs;

      if (stemMs >= stem.reader.durationMs) {
        continue;
      }

      // A stem that has not begun yet waits, in context time, for its first sample.
      voice.start(
        Math.max(0, stemMs),
        stemMs < 0 ? when + -stemMs / (MS_PER_SECOND * rate) : when,
      );
    }
  };

  const setState = (next: CompositeEngineState) => {
    if (state !== next) {
      state = next;
      notify();
    }
  };

  /** Schedules the next wrap of the loop, once the end is within the lookahead. */
  const pollLoop = () => {
    if (!loop || state !== 'playing') {
      return;
    }

    const now = context.currentTime;

    if (wrap) {
      if (now >= wrap.at) {
        wrap = null;
        notify();
      }

      return;
    }

    const position = positionAt(now);
    const endsAt = now + (loop.endMs - position) / (MS_PER_SECOND * rate);

    if (position >= loop.endMs) {
      // Already past the end (the loop was set late): start over right away.
      startVoices(loop.startMs);

      return;
    }

    if (endsAt - now <= LOOP_LOOKAHEAD_S) {
      const before = { ms: anchorMs, time: anchorTime };

      startVoices(loop.startMs, endsAt);
      wrap = { at: endsAt, before };
    }
  };

  const poll = () => {
    pollLoop();

    if (state === 'playing' && positionAt(context.currentTime) >= durationMs) {
      stopVoices();
      anchorMs = durationMs;
      setState('ended');
    }
  };

  const handle = timers.setInterval(poll, ENDED_POLL_MS);

  const restartFrom = (positionMs: number) => {
    stopVoices();
    startVoices(positionMs);
  };

  return {
    durationMs,
    canCompensatePitch: pitchStage !== null,
    getState: () => state,
    getPositionMs,
    getRate: () => rate,
    getVolume: () => volume,
    subscribe: (listener) => {
      listeners.add(listener);

      return () => listeners.delete(listener);
    },
    play: () => {
      if (disposed || state === 'playing') {
        return;
      }

      void context.resume();

      // Playing again from the end starts over, as a track does.
      const from = state === 'ended' || anchorMs >= durationMs ? 0 : anchorMs;

      applyShapePath();
      startVoices(from);
      setState('playing');
    },
    pause: () => {
      if (state !== 'playing') {
        return;
      }

      anchorMs = positionAt(context.currentTime);
      wrap = null;
      stopVoices();
      setState('paused');
    },
    seek: (positionMs) => {
      const target = Math.min(durationMs, Math.max(0, positionMs));

      if (state === 'playing') {
        restartFrom(target);
      } else {
        anchorMs = target;
        setState('paused');
      }

      notify();
    },
    setLoop: (nextLoop) => {
      const valid =
        nextLoop && nextLoop.endMs > nextLoop.startMs && nextLoop.startMs >= 0;

      if (state === 'playing' && wrap) {
        // Pick up the new range from where the sound is now.
        restartFrom(positionAt(context.currentTime));
      }

      loop = valid ? nextLoop : null;
      notify();
    },
    getLoop: () => loop,
    setStemGains: (gains) => {
      for (const { stem, gain } of slots) {
        const target = gains[stem.id];

        if (target !== undefined) {
          rampGain(context, gain, target);
        }
      }
    },
    setRate: (nextRate) => {
      if (!(nextRate > 0) || nextRate === rate) {
        return;
      }

      const position = getPositionMs();
      const wasPlaying = state === 'playing';

      if (wasPlaying) {
        stopVoices();
      }

      // The clock is re-anchored at the current position before the new rate.
      anchorMs = position;
      anchorTime = context.currentTime;
      rate = nextRate;
      applyShapePath();

      if (wasPlaying) {
        startVoices(position);
      }

      notify();
    },
    setPitchSemitones: (semitones) => {
      if (semitones === pitchSemitones) {
        return;
      }

      pitchSemitones = semitones;
      applyShapePath();
      notify();
    },
    setVolume: (nextVolume) => {
      volume = Math.min(1, Math.max(0, nextVolume));
      rampGain(context, master, volume);
    },
    dispose: () => {
      disposed = true;
      timers.clearInterval(handle);
      slots.forEach(({ voice }) => voice.dispose());
      pitchStage?.dispose();
      listeners.clear();
    },
  };
};
