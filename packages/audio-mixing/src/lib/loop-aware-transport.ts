import type {
  SyncTimers,
  Transport,
  TransportEvent,
} from './sync-controller.ts';

/**
 * Tells a loop wrap from a seek (rehearsal-recording design Decision 5). A
 * media element reports a loop repeating as one more `seeked`, the same as a
 * user's seek, but the sync controller must count the first and restart on the
 * second: pass n of a loop recording plays over pass n of the loop.
 */

/** Near enough to the range end or start to be the player wrapping, not a seek. */
export const DEFAULT_LOOP_WRAP_TOLERANCE_MS = 600;
const DEFAULT_SAMPLE_MS = 100;

export type LoopRange = { startMs: number; endMs: number };

/**
 * Whether a jump from `previousMs` to `currentMs` is the loop starting over:
 * it left from just before the range end and landed just after its start.
 */
export const isLoopWrap = (options: {
  previousMs: number;
  currentMs: number;
  range: LoopRange;
  toleranceMs?: number;
}): boolean => {
  const { currentMs, previousMs, range } = options;
  const tolerance = options.toleranceMs ?? DEFAULT_LOOP_WRAP_TOLERANCE_MS;

  return (
    currentMs < previousMs &&
    previousMs >= range.endMs - tolerance &&
    currentMs <= range.startMs + tolerance
  );
};

export type LoopAwareTransportOptions = {
  transport: Transport;
  range: LoopRange;
  timers?: SyncTimers;
  sampleMs?: number;
  toleranceMs?: number;
};

export type LoopAwareTransport = Transport & { dispose: () => void };

const defaultTimers: SyncTimers = {
  setInterval: (callback, ms) => globalThis.setInterval(callback, ms),
  clearInterval: (handle) =>
    globalThis.clearInterval(handle as ReturnType<typeof setInterval>),
};

/**
 * Wraps a transport so a seek that is the loop repeating is reported as
 * `loop`. It remembers the furthest point the track reached by sampling while
 * it plays, because by the time `seeked` arrives the position is already the
 * new one.
 */
export const createLoopAwareTransport = (
  options: LoopAwareTransportOptions,
): LoopAwareTransport => {
  const { range, transport } = options;
  const timers = options.timers ?? defaultTimers;
  let lastMs = transport.getPositionMs();
  const handle = timers.setInterval(() => {
    if (!transport.isPlaying()) {
      return;
    }

    // Only forward movement counts. The player reports a seek's new position
    // as soon as it starts, before `seeked` arrives, and taking that as "where
    // the track was" would hide the very jump we are looking for; the event
    // itself records the position after a jump.
    lastMs = Math.max(lastMs, transport.getPositionMs());
  }, options.sampleMs ?? DEFAULT_SAMPLE_MS);

  return {
    getPositionMs: () => transport.getPositionMs(),
    isPlaying: () => transport.isPlaying(),
    subscribe: (listener) =>
      transport.subscribe((event: TransportEvent) => {
        const currentMs = transport.getPositionMs();
        const reported =
          event === 'seek' &&
          isLoopWrap({
            previousMs: lastMs,
            currentMs,
            range,
            toleranceMs: options.toleranceMs,
          })
            ? 'loop'
            : event;

        lastMs = currentMs;
        listener(reported);
      }),
    dispose: () => timers.clearInterval(handle),
  };
};
