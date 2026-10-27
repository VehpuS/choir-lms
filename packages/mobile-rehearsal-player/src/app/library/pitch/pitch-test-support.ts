import type { VisibilitySource } from './app-visibility';
import {
  PcmSourceError,
  type PcmFrame,
  type PcmPermission,
  type PcmSource,
  type PcmSourceFailure,
  type PcmSubscriber,
} from './pcm-source-types';
import type { PitchFlagStorage } from './pitch-store';

export const SAMPLE_RATE = 44100;
const FRAME_SIZE = 2048;
const HOP_SECONDS = 1024 / SAMPLE_RATE;

/** Lets pending promise callbacks run. */
export const settle = () =>
  new Promise<void>((resolve) => setImmediate(resolve));

/** Frames of a steady sine, one per hop, starting at `startSec`. */
export const sineFrames = (
  frequencyHz: number,
  count: number,
  startSec = 1,
): PcmFrame[] => {
  const frames: PcmFrame[] = [];

  for (let index = 0; index < count; index++) {
    const captureTimeSec = startSec + index * HOP_SECONDS;
    const samples = new Float32Array(FRAME_SIZE);

    for (let sample = 0; sample < FRAME_SIZE; sample++) {
      const time = captureTimeSec - (FRAME_SIZE - sample) / SAMPLE_RATE;

      samples[sample] = 0.5 * Math.sin(2 * Math.PI * frequencyHz * time);
    }

    frames.push({ samples, sampleRate: SAMPLE_RATE, captureTimeSec });
  }

  return frames;
};

export type FakePcmSource = PcmSource & {
  subscriberCount: () => number;
  subscribeCalls: () => number;
  permissionQueries: () => number;
  setPermission: (permission: PcmPermission) => void;
  failNext: (reason: PcmSourceFailure) => void;
  /** Makes the next `subscribe` wait until `release` is called. */
  holdNext: () => () => void;
  emit: (frame: PcmFrame) => void;
  interrupt: () => void;
  recover: () => void;
  end: () => void;
};

export const createFakePcmSource = (
  initialPermission: PcmPermission = 'prompt',
): FakePcmSource => {
  const subscribers = new Set<PcmSubscriber>();
  let permission = initialPermission;
  let subscribes = 0;
  let queries = 0;
  let failure: PcmSourceFailure | null = null;
  let hold: Promise<void> | null = null;

  return {
    queryPermission: async () => {
      queries += 1;

      return permission;
    },
    subscribe: async (subscriber) => {
      subscribes += 1;

      if (hold) {
        const waiting = hold;

        hold = null;
        await waiting;
      }

      if (failure) {
        const reason = failure;

        failure = null;
        throw new PcmSourceError(reason);
      }

      subscribers.add(subscriber);
      permission = 'granted';

      return () => {
        subscribers.delete(subscriber);
      };
    },
    subscriberCount: () => subscribers.size,
    subscribeCalls: () => subscribes,
    permissionQueries: () => queries,
    setPermission: (next) => {
      permission = next;
    },
    failNext: (reason) => {
      failure = reason;
    },
    holdNext: () => {
      let release = () => undefined as void;

      hold = new Promise<void>((resolve) => {
        release = resolve;
      });

      return release;
    },
    emit: (frame) => [...subscribers].forEach((s) => s.onFrame(frame)),
    interrupt: () => [...subscribers].forEach((s) => s.onInterrupted?.()),
    recover: () => [...subscribers].forEach((s) => s.onRecovered?.()),
    end: () => {
      const ending = [...subscribers];

      subscribers.clear();
      ending.forEach((s) => s.onEnded?.());
    },
  };
};

export type FakeVisibility = VisibilitySource & {
  set: (visible: boolean) => void;
};

export const createFakeVisibility = (initial = true): FakeVisibility => {
  let visible = initial;
  const listeners = new Set<(visible: boolean) => void>();

  return {
    isVisible: () => visible,
    subscribe: (listener) => {
      listeners.add(listener);

      return () => {
        listeners.delete(listener);
      };
    },
    set: (next) => {
      visible = next;
      listeners.forEach((listener) => listener(next));
    },
  };
};

export type FakeStorage = PitchFlagStorage & {
  entries: () => Record<string, string>;
  writes: () => Array<[string, string]>;
};

export const createFakeStorage = (
  initial: Record<string, string> = {},
): FakeStorage => {
  const values = { ...initial };
  const writes: Array<[string, string]> = [];

  return {
    getItem: async (key) => values[key] ?? null,
    setItem: async (key, value) => {
      values[key] = value;
      writes.push([key, value]);
    },
    entries: () => ({ ...values }),
    writes: () => [...writes],
  };
};
