import { nearestSample, SAMPLE_MIDIS } from './piano-samples';
import {
  pianoVolumeToGain,
  type PianoNoteHandle,
  type PianoVoice,
} from './piano-voice';
import type { AudioBufferLike, AudioContextLike } from './web-audio-types';

const ATTACK_SECONDS = 0.005;
const RELEASE_SECONDS = 0.25;
const STOP_MARGIN_SECONDS = 0.05;
/** Headroom so ten notes at full volume do not clip the output. */
const NOTE_LEVEL = 0.5;
/** Floor for exponential ramps, which cannot reach exactly zero. */
const SILENCE = 0.0001;
/** After a failed load, the next press or prime may try again this much later. */
export const LOAD_RETRY_MS = 10_000;

type LoadState = 'idle' | 'loading' | 'ready' | 'failed';

export type SampledPianoVoiceOptions = {
  /** Used for every press once the recordings are known not to load. */
  fallback: PianoVoice;
  /** Fetches one recording as encoded audio. */
  loadSample: (midi: number) => Promise<ArrayBuffer>;
};

/**
 * The `Piano` sound: recorded notes, one every minor third, pitch-shifted to
 * the key. The recordings load on `load()` (the engine asks as soon as the
 * piano opens) or the first press, and stay for the session. A press made
 * before they are ready sounds at once through the fallback voice, never later
 * and never not at all: a first note on a cold start, with 21 files still on
 * the way, used to be thrown away after waiting too long. A load that failed is
 * tried again later (a network hiccup at launch must not leave the session on
 * the fallback sound), with no report to the user (they have nothing to act on).
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
  let failedAt = 0;

  master.gain.value = 1;
  master.connect(context.destination);

  const load = (): Promise<void> => {
    if (loading) {
      return loading;
    }

    // Not again straight after a failure: every gesture asks, and a dead
    // network would otherwise be hit 21 files at a time on each of them.
    if (state === 'failed' && Date.now() - failedAt < LOAD_RETRY_MS) {
      return Promise.resolve();
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
        failedAt = Date.now();
        loading = null;
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

    // Not ready: start (or retry) the load, and sound this note now.
    if (state !== 'loading') {
      void load();
    }

    return options.fallback.noteOn(midi, velocity);
  };

  return {
    load,
    noteOn,
    setVolume: (volume) => {
      master.gain.value = pianoVolumeToGain(volume);
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
