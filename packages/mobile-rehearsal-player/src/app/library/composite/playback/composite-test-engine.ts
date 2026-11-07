import type {
  CompositeEngine,
  CompositeEngineState,
} from '../engine/composite-engine';

/** A scriptable engine that records the calls made on it, for specs of the player seam. */
export const createTestEngine = (durationMs = 60_000) => {
  const calls: Array<[string, ...unknown[]]> = [];
  const listeners = new Set<() => void>();
  const state = {
    value: 'paused' as CompositeEngineState,
    positionMs: 0,
    rate: 1,
    volume: 1,
    disposed: false,
  };
  const record =
    <Args extends unknown[]>(name: string, change?: (...args: Args) => void) =>
    (...args: Args) => {
      calls.push([name, ...args]);
      change?.(...args);
    };
  const engine: CompositeEngine = {
    durationMs,
    canCompensatePitch: true,
    getState: () => state.value,
    getPositionMs: () => state.positionMs,
    getRate: () => state.rate,
    getVolume: () => state.volume,
    subscribe: (listener) => {
      listeners.add(listener);

      return () => listeners.delete(listener);
    },
    play: record('play', () => {
      state.value = 'playing';
    }),
    pause: record('pause', () => {
      state.value = 'paused';
    }),
    seek: record('seek', (ms: number) => {
      state.positionMs = ms;
    }),
    setStemGains: record('setStemGains'),
    setRate: record('setRate', (rate: number) => {
      state.rate = rate;
    }),
    setPitchSemitones: record('setPitchSemitones'),
    setVolume: record('setVolume', (volume: number) => {
      state.volume = volume;
    }),
    dispose: record('dispose', () => {
      state.disposed = true;
    }),
  };

  return {
    engine,
    calls,
    state,
    emit: () => listeners.forEach((listener) => listener()),
    finish: () => {
      state.value = 'ended';
      listeners.forEach((listener) => listener());
    },
  };
};
