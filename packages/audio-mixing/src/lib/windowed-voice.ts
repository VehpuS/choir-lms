import type { PcmWindowReader } from './wav-window-reader.ts';
import type { SyncTimers, Voice } from './sync-controller.ts';

/**
 * The recording's voice (rehearsal-recording design Decision 5): plays a
 * recording through Web Audio a window at a time, with the next window read
 * ahead of the playhead, so a long recording is never held decoded. It depends
 * on the small context interfaces below, not on the browser, so it is specced
 * with fakes.
 */

export type VoiceParam = {
  value: number;
  setValueAtTime: (value: number, time: number) => void;
  linearRampToValueAtTime: (value: number, time: number) => void;
};

// Method syntax, so the browser's own audio nodes are assignable.
export type VoiceNode = { connect(destination: VoiceNode): void };
export type VoiceGain = VoiceNode & { gain: VoiceParam };
export type VoiceBuffer = {
  copyToChannel: (data: Float32Array, channel: number) => void;
};
export type VoiceSource = VoiceNode & {
  buffer: VoiceBuffer | null;
  start: (when: number, offsetSeconds?: number) => void;
  stop: (when?: number) => void;
};
export type VoiceContext = {
  currentTime: number;
  createBuffer: (
    channels: number,
    length: number,
    sampleRate: number,
  ) => VoiceBuffer;
  createBufferSource: () => VoiceSource;
  createGain: () => VoiceGain;
};

export const DEFAULT_WINDOW_MS = 30_000;
/** How far ahead of the playhead the next window must already be scheduled. */
export const DEFAULT_LOOKAHEAD_MS = 12_000;
/** Long enough to hide a restart click, short enough not to be heard as a fade. */
export const DEFAULT_FADE_MS = 15;
const PUMP_MS = 1000;
const MS_PER_SECOND = 1000;
const MIN_WINDOW_TAIL_MS = 5;

export type WindowedVoiceOptions = {
  context: VoiceContext;
  /** Where the voice connects: the balance gain, then the context output. */
  output: VoiceNode;
  reader: PcmWindowReader;
  windowMs?: number;
  lookaheadMs?: number;
  fadeMs?: number;
  timers?: SyncTimers;
  /** Called once, the first time a window cannot be read. */
  onUnavailable?: (error: unknown) => void;
};

export type WindowedVoice = Voice & { dispose: () => void };

/** One uninterrupted start: windows are placed on the context clock from here. */
type Run = {
  fromMs: number;
  startedAt: number;
  scheduledThroughMs: number;
  loading: boolean;
  sources: Array<{ source: VoiceSource; gain: VoiceGain }>;
};

const defaultTimers: SyncTimers = {
  setInterval: (callback, ms) => globalThis.setInterval(callback, ms),
  clearInterval: (handle) =>
    globalThis.clearInterval(handle as ReturnType<typeof setInterval>),
};

export const createWindowedVoice = (
  options: WindowedVoiceOptions,
): WindowedVoice => {
  const { context, output, reader } = options;
  const windowMs = options.windowMs ?? DEFAULT_WINDOW_MS;
  const lookaheadMs = options.lookaheadMs ?? DEFAULT_LOOKAHEAD_MS;
  const fadeSeconds = (options.fadeMs ?? DEFAULT_FADE_MS) / MS_PER_SECOND;
  const timers = options.timers ?? defaultTimers;
  let run: Run | null = null;
  let isUnavailable = false;

  const positionOf = (current: Run) =>
    current.fromMs + (context.currentTime - current.startedAt) * MS_PER_SECOND;

  const release = (current: Run, fade: boolean) => {
    const now = context.currentTime;

    current.sources.forEach(({ source, gain }) => {
      try {
        if (fade) {
          gain.gain.setValueAtTime(gain.gain.value, now);
          gain.gain.linearRampToValueAtTime(0, now + fadeSeconds);
          source.stop(now + fadeSeconds);
        } else {
          source.stop(now);
        }
      } catch {
        // A source that never started or already ended has nothing to stop.
      }
    });
    current.sources = [];
  };

  const fail = (error: unknown) => {
    if (isUnavailable) {
      return;
    }

    isUnavailable = true;
    options.onUnavailable?.(error);
  };

  /** Reads one window and places it where the run's clock says it belongs. */
  const scheduleWindow = async (current: Run, index: number) => {
    const windowStartMs = index * windowMs;

    if (windowStartMs >= reader.durationMs) {
      current.scheduledThroughMs = Number.POSITIVE_INFINITY;

      return;
    }

    current.loading = true;

    try {
      const startSample = Math.round(
        (windowStartMs / MS_PER_SECOND) * reader.sampleRate,
      );
      const count = Math.round((windowMs / MS_PER_SECOND) * reader.sampleRate);
      const samples = await reader.read(startSample, count);

      if (run !== current) {
        return;
      }

      const buffer = context.createBuffer(1, samples.length, reader.sampleRate);

      buffer.copyToChannel(samples, 0);

      const now = context.currentTime;
      const idealWhen =
        current.startedAt + (windowStartMs - current.fromMs) / MS_PER_SECOND;
      // Where the playhead is within this window now: part-way in when the run
      // began inside it, or when the read finished after the window was due.
      const playheadMs =
        current.fromMs + (now - current.startedAt) * MS_PER_SECOND;
      const offsetSeconds = Math.max(
        0,
        (playheadMs - windowStartMs) / MS_PER_SECOND,
      );
      const windowSeconds = samples.length / reader.sampleRate;

      current.scheduledThroughMs = windowStartMs + windowMs;

      if (offsetSeconds >= windowSeconds - MIN_WINDOW_TAIL_MS / MS_PER_SECOND) {
        return;
      }

      const source = context.createBufferSource();
      const gain = context.createGain();
      const when = Math.max(now, idealWhen);

      source.buffer = buffer;
      source.connect(gain);
      gain.connect(output);
      // The first window of a run fades in, so a restart never clicks.
      if (index === Math.floor(current.fromMs / windowMs) || idealWhen < now) {
        gain.gain.setValueAtTime(0, when);
        gain.gain.linearRampToValueAtTime(1, when + fadeSeconds);
      }
      source.start(when, offsetSeconds);
      current.sources.push({ source, gain });
    } catch (error) {
      fail(error);
    } finally {
      current.loading = false;
    }
  };

  /** Keeps the next window scheduled ahead of the playhead. */
  const pump = () => {
    if (!run || run.loading || isUnavailable) {
      return;
    }

    if (positionOf(run) + lookaheadMs >= run.scheduledThroughMs) {
      void scheduleWindow(run, Math.floor(run.scheduledThroughMs / windowMs));
    }
  };

  const handle = timers.setInterval(pump, PUMP_MS);

  return {
    start: (recordingMs) => {
      if (isUnavailable) {
        return;
      }

      if (run) {
        release(run, true);
      }

      const current: Run = {
        fromMs: recordingMs,
        startedAt: context.currentTime,
        scheduledThroughMs: Math.floor(recordingMs / windowMs) * windowMs,
        loading: false,
        sources: [],
      };

      run = current;
      void scheduleWindow(current, Math.floor(recordingMs / windowMs));
    },
    stop: () => {
      if (run) {
        release(run, true);
        run = null;
      }
    },
    getPositionMs: () => {
      if (!run) {
        return null;
      }

      const position = positionOf(run);

      return position >= reader.durationMs ? null : position;
    },
    dispose: () => {
      timers.clearInterval(handle);

      if (run) {
        release(run, false);
        run = null;
      }
    },
  };
};
