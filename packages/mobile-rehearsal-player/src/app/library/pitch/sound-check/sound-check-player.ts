import type { PcmSource } from '../pcm-source-types';
import {
  buildSoundCheckSignal,
  encodeSoundCheckWav,
} from './sound-check-signal';
import {
  levelDb,
  type ContextReading,
  type SoundCheckReadout,
} from './sound-check-model';

/**
 * The Sound check's audio, behind small interfaces so the page's logic is
 * specced with fakes (the real ones are in `sound-check-browser.ts`). Each
 * test sound and the microphone are independent switches, so any combination
 * can be heard; `stopAll` leaves nothing running.
 */

export type ToneKind = 'web-audio-new' | 'web-audio-app' | 'media-element';
export type MicrophoneStatus = 'off' | 'opening' | 'open' | 'failed';

export type SoundCheckState = {
  tones: Record<ToneKind, boolean>;
  microphone: MicrophoneStatus;
};

type BufferSourceLike = {
  buffer: unknown;
  loop: boolean;
  connect: (destination: unknown) => void;
  start: () => void;
  stop: () => void;
};

export type SoundContextLike = {
  state: string;
  sampleRate: number;
  outputLatency?: number;
  destination: unknown;
  resume: () => Promise<void>;
  close?: () => Promise<void>;
  createBuffer: (
    channels: number,
    length: number,
    sampleRate: number,
  ) => { getChannelData: (channel: number) => Float32Array };
  createBufferSource: () => BufferSourceLike;
};

export type SoundElementLike = {
  loop: boolean;
  paused: boolean;
  play: () => Promise<void> | void;
  pause: () => void;
};

export type SoundCheckDependencies = {
  /** A new audio context, created inside the press that starts a sound. */
  createContext: () => SoundContextLike | null;
  /** The context the composite engine plays through, or null before it exists. */
  getAppContext: () => SoundContextLike | null;
  /** The app's context, creating it if it does not exist yet. */
  ensureAppContext: () => SoundContextLike | null;
  createElement: (wav: Uint8Array) => {
    element: SoundElementLike;
    release: () => void;
  } | null;
  getSessionType: () => string | null;
  setSessionType: (type: string) => void;
  isCapturing: () => boolean;
  microphone: Pick<PcmSource, 'subscribe'>;
};

const ELEMENT_SAMPLE_RATE = 44_100;
const STEREO = 2;

const readContext = (
  context: SoundContextLike | null,
): ContextReading | null =>
  context
    ? {
        state: context.state,
        sampleRate: context.sampleRate,
        outputLatency: context.outputLatency,
      }
    : null;

type Running = { stop: () => void };

export const createSoundCheck = (dependencies: SoundCheckDependencies) => {
  let state: SoundCheckState = {
    tones: {
      'web-audio-new': false,
      'web-audio-app': false,
      'media-element': false,
    },
    microphone: 'off',
  };
  const listeners = new Set<() => void>();
  const running = new Map<ToneKind, Running>();
  let testContext: SoundContextLike | null = null;
  let microphone: {
    sampleRate: number;
    levelDb: number | null;
    stop: () => void;
  } | null = null;
  // A press that opens the microphone can be undone before it finishes.
  let microphoneRequest = 0;

  const publish = (next: SoundCheckState) => {
    state = next;
    listeners.forEach((listener) => listener());
  };

  const setTone = (kind: ToneKind, isOn: boolean) =>
    publish({ ...state, tones: { ...state.tones, [kind]: isOn } });

  const playBuffer = (context: SoundContextLike): Running => {
    const signal = buildSoundCheckSignal(context.sampleRate);
    const buffer = context.createBuffer(
      STEREO,
      signal.left.length,
      context.sampleRate,
    );

    buffer.getChannelData(0).set(signal.left);
    buffer.getChannelData(1).set(signal.right);

    const source = context.createBufferSource();

    source.buffer = buffer;
    source.loop = true;
    source.connect(context.destination);
    source.start();

    return { stop: () => source.stop() };
  };

  const start = async (kind: ToneKind): Promise<Running | null> => {
    if (kind === 'media-element') {
      const created = dependencies.createElement(
        encodeSoundCheckWav(buildSoundCheckSignal(ELEMENT_SAMPLE_RATE)),
      );

      if (!created) {
        return null;
      }

      created.element.loop = true;
      await created.element.play();

      return {
        stop: () => {
          created.element.pause();
          created.release();
        },
      };
    }

    const context =
      kind === 'web-audio-app'
        ? dependencies.ensureAppContext()
        : (testContext ??= dependencies.createContext());

    if (!context) {
      return null;
    }

    await context.resume();

    const playing = playBuffer(context);

    return {
      stop: () => {
        playing.stop();

        // The new context goes with its sound, so the next press starts clean.
        if (kind === 'web-audio-new') {
          void testContext?.close?.();
          testContext = null;
        }
      },
    };
  };

  const toggleTone = async (kind: ToneKind) => {
    const current = running.get(kind);

    if (current) {
      running.delete(kind);
      current.stop();
      setTone(kind, false);

      return;
    }

    try {
      const started = await start(kind);

      if (started) {
        running.set(kind, started);
        setTone(kind, true);
      }
    } catch {
      setTone(kind, false);
    }
  };

  const stopMicrophone = () => {
    microphoneRequest += 1;
    microphone?.stop();
    microphone = null;
    publish({ ...state, microphone: 'off' });
  };

  const toggleMicrophone = async () => {
    if (state.microphone === 'open' || state.microphone === 'opening') {
      stopMicrophone();

      return;
    }

    microphoneRequest += 1;
    const request = microphoneRequest;

    publish({ ...state, microphone: 'opening' });

    try {
      const unsubscribe = await dependencies.microphone.subscribe({
        // The analysis frames pitch detection uses; the raw block stream is
        // the recorder's alone (see `recording-audio-writers.spec.ts`).
        onFrame: (frame) => {
          if (microphone) {
            microphone.sampleRate = frame.sampleRate;
            microphone.levelDb = levelDb(frame.samples);
          }
        },
        onEnded: () => {
          microphone = null;
          publish({ ...state, microphone: 'off' });
        },
      });

      if (request !== microphoneRequest) {
        unsubscribe();

        return;
      }

      microphone = { sampleRate: 0, levelDb: null, stop: unsubscribe };
      publish({ ...state, microphone: 'open' });
    } catch {
      if (request === microphoneRequest) {
        publish({ ...state, microphone: 'failed' });
      }
    }
  };

  return {
    getState: () => state,
    subscribe: (listener: () => void) => {
      listeners.add(listener);

      return () => {
        listeners.delete(listener);
      };
    },
    toggleTone,
    toggleMicrophone,
    setSessionType: dependencies.setSessionType,
    /** What the page can see right now; read on a timer while the page is open. */
    readReadout: (): SoundCheckReadout => ({
      sessionType: dependencies.getSessionType(),
      isCapturing: dependencies.isCapturing(),
      microphone:
        microphone && microphone.sampleRate > 0
          ? { sampleRate: microphone.sampleRate, levelDb: microphone.levelDb }
          : null,
      appContext: readContext(dependencies.getAppContext()),
      testContext: readContext(testContext),
      isMediaElementPlaying: running.has('media-element'),
    }),
    /** Leaves nothing running: every sound stopped and the microphone closed. */
    stopAll: () => {
      [...running.values()].forEach((tone) => tone.stop());
      running.clear();
      microphone?.stop();
      microphone = null;
      microphoneRequest += 1;
      publish({
        tones: {
          'web-audio-new': false,
          'web-audio-app': false,
          'media-element': false,
        },
        microphone: 'off',
      });
    },
  };
};

export type SoundCheck = ReturnType<typeof createSoundCheck>;
