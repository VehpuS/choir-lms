import { nearestSample, SAMPLE_MIDIS } from './piano-samples';
import type { PianoNoteHandle, PianoVoice } from './piano-voice';
import type { AudioBufferLike, AudioContextLike } from './web-audio-types';

const ATTACK_SECONDS = 0.005;
const RELEASE_SECONDS = 0.25;
const STOP_MARGIN_SECONDS = 0.05;
/** Headroom so ten notes at full volume do not clip the output. */
const NOTE_LEVEL = 0.5;
/** Floor for exponential ramps, which cannot reach exactly zero. */
const SILENCE = 0.0001;
/** A press made while the recordings load sounds only if they arrive in time. */
export const QUEUED_PRESS_LIMIT_MS = 1500;
/** A press that ended while it waited still sounds for this long. */
const MIN_QUEUED_NOTE_MS = 200;

type LoadState = 'idle' | 'loading' | 'ready' | 'failed';

export type SampledPianoVoiceOptions = {
  /** Used for every press once the recordings are known not to load. */
  fallback: PianoVoice;
  /** Fetches one recording as encoded audio. */
  loadSample: (midi: number) => Promise<ArrayBuffer>;
  /** Called once, when the recordings fail to load. */
  onLoadFailed?: () => void;
};

/**
 * The `Piano` sound: recorded notes, one every minor third, pitch-shifted to
 * the key. The recordings load on the first press (or `load()`) and stay for
 * the session. A press that arrives while they load is held and played on
 * arrival if it is still recent; if they cannot load, the fallback voice
 * plays instead.
 */
export const createSampledPianoVoice = (
  context: AudioContextLike,
  options: SampledPianoVoiceOptions,
): PianoVoice => {
  const master = context.createGain();
  const buffers = new Map<number, AudioBufferLike>();
  const live = new Set<() => void>();
  let state: LoadState = 'idle';
  let loading: Promise<void> | null = null;

  master.gain.value = 1;
  master.connect(context.destination);

  const load = (): Promise<void> => {
    if (loading) {
      return loading;
    }

    state = 'loading';
    loading = Promise.all(
      SAMPLE_MIDIS.map(async (midi) => {
        const encoded = await options.loadSample(midi);

        buffers.set(midi, await context.decodeAudioData(encoded));
      }),
    ).then(
      () => {
        state = 'ready';
      },
      () => {
        state = 'failed';
        options.onLoadFailed?.();
      },
    );

    return loading;
  };

  const playSample = (midi: number, velocity: number): PianoNoteHandle => {
    const { playbackRate, sampleMidi } = nearestSample(midi);
    const now = context.currentTime;
    const source = context.createBufferSource();
    const envelope = context.createGain();

    source.buffer = buffers.get(sampleMidi) ?? null;
    source.playbackRate.value = playbackRate;
    envelope.gain.setValueAtTime(0, now);
    envelope.gain.linearRampToValueAtTime(
      NOTE_LEVEL * velocity,
      now + ATTACK_SECONDS,
    );
    source.connect(envelope);
    envelope.connect(master);
    source.start(now);

    let released = false;
    const release = () => {
      if (released) {
        return;
      }

      released = true;
      live.delete(release);

      const at = context.currentTime;

      envelope.gain.cancelScheduledValues(at);
      envelope.gain.setValueAtTime(Math.max(envelope.gain.value, SILENCE), at);
      envelope.gain.exponentialRampToValueAtTime(SILENCE, at + RELEASE_SECONDS);
      source.stop(at + RELEASE_SECONDS + STOP_MARGIN_SECONDS);
    };

    // The recording ends by itself; free the nodes whichever way it stops.
    source.onended = () => {
      live.delete(release);
      envelope.disconnect();
    };
    live.add(release);

    return { release };
  };

  const noteOn = (midi: number, velocity: number): PianoNoteHandle => {
    if (state === 'ready') {
      return playSample(midi, velocity);
    }

    if (state === 'failed') {
      return options.fallback.noteOn(midi, velocity);
    }

    // Recordings still loading: hold the press and play it on arrival.
    const pressedAt = Date.now();
    let isReleased = false;
    let sounding: PianoNoteHandle | null = null;

    void load().then(() => {
      if (Date.now() - pressedAt > QUEUED_PRESS_LIMIT_MS) {
        return;
      }

      sounding =
        state === 'ready'
          ? playSample(midi, velocity)
          : options.fallback.noteOn(midi, velocity);

      if (isReleased) {
        setTimeout(() => {
          sounding?.release();
        }, MIN_QUEUED_NOTE_MS);
      }
    });

    return {
      release: () => {
        isReleased = true;
        sounding?.release();
      },
    };
  };

  return {
    load,
    noteOn,
    setVolume: (volume) => {
      master.gain.value = volume;
      options.fallback.setVolume(volume);
    },
    dispose: () => {
      [...live].forEach((release) => {
        release();
      });
      master.disconnect();
      options.fallback.dispose();
    },
  };
};
