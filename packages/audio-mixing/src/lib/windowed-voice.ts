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
  /** Absent in the recording overlay's fakes; the composite engine sets it for shaped playback. */
  playbackRate?: { value: number };
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

/** Samples of the next window baked into the end of each window (spike 1.2: 64 samples, 1.5 ms). */
export const COMPOSITE_OVERLAP_SAMPLES = 64;

export type WindowedVoiceOptions = {
  context: VoiceContext;
  /** Where the voice connects: the balance gain, then the context output. */
  output: VoiceNode;
  reader: PcmWindowReader;
  windowMs?: number;
  lookaheadMs?: number;
  fadeMs?: number;
  /**
   * Samples of the next window baked into the tail of each window as
   * complementary linear fades (fade-out on the tail, fade-in on the next
   * window's head). Windows placed at a rate other than 1 land on fractions of
   * a sample and click at the join without it. Zero (the default) leaves the
   * recording overlay's butt joints as they were.
   */
  overlapSamples?: number;
  /** Media seconds per second of context time; 1 by default (spike 1.2). */
  rate?: number;
  timers?: SyncTimers;
  /** Called once, the first time a window cannot be read. */
  onUnavailable?: (error: unknown) => void;
};

export type WindowedVoice = Omit<Voice, 'start'> & {
  /**
   * Starts at this media position. `when` is a context time to start at (now by
   * default), so several voices can begin on the same instant; a `when` in the
   * future holds the voice silent until then.
   */
  start: (recordingMs: number, when?: number) => void;
  /** Changes the rate; while playing, it re-anchors at the current position like a seek. */
  setRate: (rate: number) => void;
  dispose: () => void;
};

/** One uninterrupted start: windows are placed on the context clock from here. */
type Run = {
  rate: number;
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

const MIN_RATE = 0.25;
const MAX_RATE = 4;

const sanitizeRate = (value: number | undefined): number => {
  return value !== undefined && Number.isFinite(value) && value > 0
    ? Math.min(MAX_RATE, Math.max(MIN_RATE, value))
    : 1;
};

type OverlapFades = {
  overlapSamples: number;
  /** Fade the first `overlapSamples` in (a window that follows another). */
  head: boolean;
  /** Fade the last `overlapSamples` out (a window that is followed by another). */
  tail: boolean;
  /** Samples of the window proper; the overlap is read after them. */
  bodySamples: number;
};

/**
 * Complementary linear fades over the same media samples: window k carries the
 * first samples of window k + 1 after its body and fades them out, window k + 1
 * fades its own first samples in. Played together over the join they sum to
 * the signal whatever sample the join rounds to.
 */
const bakeOverlapFades = (samples: Float32Array, fades: OverlapFades) => {
  const { overlapSamples, bodySamples } = fades;

  if (overlapSamples === 0) {
    return;
  }

  if (fades.head) {
    const length = Math.min(overlapSamples, samples.length);

    for (let index = 0; index < length; index += 1) {
      samples[index] *= (index + 1) / (overlapSamples + 1);
    }
  }

  // Only a window that really carries the next window's samples fades out.
  if (fades.tail && samples.length > bodySamples) {
    const length = samples.length - bodySamples;

    for (let index = 0; index < length; index += 1) {
      samples[bodySamples + index] *= 1 - (index + 1) / (length + 1);
    }
  }
};

export const createWindowedVoice = (
  options: WindowedVoiceOptions,
): WindowedVoice => {
  const { context, output, reader } = options;
  const windowMs = options.windowMs ?? DEFAULT_WINDOW_MS;
  const lookaheadMs = options.lookaheadMs ?? DEFAULT_LOOKAHEAD_MS;
  const fadeSeconds = (options.fadeMs ?? DEFAULT_FADE_MS) / MS_PER_SECOND;
  const timers = options.timers ?? defaultTimers;
  const overlapSamples = Math.max(0, Math.floor(options.overlapSamples ?? 0));
  let rate = sanitizeRate(options.rate);
  let run: Run | null = null;
  let isUnavailable = false;

  // Held at the start position until the run's (possibly future) start time.
  const positionAt = (current: Run, time: number) =>
    current.fromMs +
    Math.max(0, time - current.startedAt) * MS_PER_SECOND * current.rate;

  const positionOf = (current: Run) => positionAt(current, context.currentTime);

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
      const samples = await reader.read(startSample, count + overlapSamples);

      if (run !== current) {
        return;
      }

      const buffer = context.createBuffer(1, samples.length, reader.sampleRate);

      buffer.copyToChannel(samples, 0);

      const now = context.currentTime;
      const idealWhen =
        current.startedAt +
        (windowStartMs - current.fromMs) / (MS_PER_SECOND * current.rate);
      // Where the playhead is within this window now: part-way in when the run
      // began inside it, or when the read finished after the window was due.
      // Buffer seconds, so the rate does not enter the offset.
      const playheadMs = positionAt(current, now);
      const offsetSeconds = Math.max(
        0,
        (playheadMs - windowStartMs) / MS_PER_SECOND,
      );
      const isFirstWindow = index === Math.floor(current.fromMs / windowMs);

      bakeOverlapFades(samples, {
        overlapSamples,
        head: !isFirstWindow,
        tail: windowStartMs + windowMs < reader.durationMs,
        bodySamples: count,
      });
      const windowSeconds = samples.length / reader.sampleRate;

      current.scheduledThroughMs = windowStartMs + windowMs;

      if (offsetSeconds >= windowSeconds - MIN_WINDOW_TAIL_MS / MS_PER_SECOND) {
        return;
      }

      const source = context.createBufferSource();
      const gain = context.createGain();
      // A run that begins inside this window (or at a future time) sounds
      // from its own start, not from where the window would have begun.
      const when = Math.max(now, idealWhen, current.startedAt);

      source.buffer = buffer;

      if (source.playbackRate) {
        source.playbackRate.value = current.rate;
      }

      source.connect(gain);
      gain.connect(output);
      // The first window of a run fades in, so a restart never clicks.
      if (isFirstWindow || idealWhen < now) {
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

  const voice: WindowedVoice = {
    start: (recordingMs, when) => {
      if (isUnavailable) {
        return;
      }

      if (run) {
        release(run, true);
      }

      const current: Run = {
        rate,
        fromMs: recordingMs,
        startedAt: when ?? context.currentTime,
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
    setRate: (nextRate) => {
      const wanted = sanitizeRate(nextRate);

      if (wanted === rate) {
        return;
      }

      const position = run ? positionOf(run) : null;

      rate = wanted;

      if (run && position !== null && !isUnavailable) {
        // Re-anchor: stop with the fade and restart at the current position.
        release(run, true);
        run = null;
        voice.start(position);
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

  return voice;
};
