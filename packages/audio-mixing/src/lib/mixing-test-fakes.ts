import type {
  SyncTimers,
  Transport,
  TransportEvent,
  Voice,
} from './sync-controller.ts';

export const createFakeTransport = (initial: {
  positionMs: number;
  playing: boolean;
}) => {
  const listeners = new Set<(event: TransportEvent) => void>();
  const state = { ...initial };
  const transport: Transport = {
    getPositionMs: () => state.positionMs,
    isPlaying: () => state.playing,
    subscribe: (listener) => {
      listeners.add(listener);
      return () => listeners.delete(listener);
    },
  };

  return {
    transport,
    listenerCount: () => listeners.size,
    emit: (event: TransportEvent, next: Partial<typeof state> = {}) => {
      Object.assign(state, next);
      listeners.forEach((listener) => listener(event));
    },
    move: (positionMs: number) => {
      state.positionMs = positionMs;
    },
  };
};

export const createFakeVoice = () => {
  const calls: Array<
    { kind: 'start'; recordingMs: number } | { kind: 'stop' }
  > = [];
  let position: number | null = null;
  const voice: Voice = {
    start: (recordingMs) => {
      calls.push({ kind: 'start', recordingMs });
      position = recordingMs;
    },
    stop: () => {
      calls.push({ kind: 'stop' });
      position = null;
    },
    getPositionMs: () => position,
  };

  return {
    voice,
    calls,
    /** Simulates the voice drifting away from where it was started. */
    setPosition: (value: number | null) => {
      position = value;
    },
  };
};

export const createFakeTimers = () => {
  let callback: (() => void) | null = null;
  const timers: SyncTimers = {
    setInterval: (cb) => {
      callback = cb;
      return 1;
    },
    clearInterval: () => {
      callback = null;
    },
  };

  return {
    timers,
    tick: () => callback?.(),
    isActive: () => callback !== null,
  };
};
