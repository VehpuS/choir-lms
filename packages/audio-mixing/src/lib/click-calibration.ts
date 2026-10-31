import { median } from 'es-toolkit';

/**
 * Click calibration (rehearsal-recording design Decision 3): clicks are played
 * through the output and found again in the microphone signal by normalised
 * cross-correlation, which measures the true round trip without any human
 * reaction time. This file is the pure analysis; playing and recording the
 * clicks belongs to the app.
 */

const CHIRP_MS = 8;
const CHIRP_START_HZ = 800;
const CHIRP_END_HZ = 8000;
const MS_PER_SECOND = 1000;
/** Normalised correlation a peak needs to count as a click and not noise. */
const MIN_CORRELATION = 0.45;
/** Earlier peaks count unless clearly weaker than the strongest in the window. */
const EARLIEST_PEAK_SHARE = 0.8;
const DEFAULT_WINDOW_MS = 600;
export const MIN_FOUND_CLICKS = 3;
/** Clicks that disagree by more than this are not one latency. */
export const MAX_CLICK_SPREAD_MS = 5;

export type ClickCalibrationFailure = 'not-heard' | 'inconsistent';

export type ClickCalibrationResult =
  | { ok: true; latencyMs: number; found: number; total: number }
  | {
      ok: false;
      reason: ClickCalibrationFailure;
      found: number;
      total: number;
    };

/** A short Hann-windowed chirp: it correlates to a sharp, unambiguous peak. */
export const createClickTemplate = (sampleRate: number): Float32Array => {
  const length = Math.round((CHIRP_MS / MS_PER_SECOND) * sampleRate);
  const duration = length / sampleRate;
  const sweep = (CHIRP_END_HZ - CHIRP_START_HZ) / duration;

  return Float32Array.from({ length }, (_, i) => {
    const t = i / sampleRate;
    const phase = 2 * Math.PI * (CHIRP_START_HZ * t + (sweep * t * t) / 2);
    const hann = 0.5 - 0.5 * Math.cos((2 * Math.PI * i) / (length - 1));

    return Math.sin(phase) * hann;
  });
};

/** A signal with the template placed at each start time (milliseconds). */
export const renderClickTrain = (
  template: Float32Array,
  startsMs: readonly number[],
  totalMs: number,
  sampleRate: number,
): Float32Array => {
  const out = new Float32Array(
    Math.ceil((totalMs / MS_PER_SECOND) * sampleRate),
  );

  startsMs.forEach((startMs) => {
    const start = Math.round((startMs / MS_PER_SECOND) * sampleRate);

    template.forEach((value, i) => {
      if (start + i < out.length) {
        out[start + i] = (out[start + i] ?? 0) + value;
      }
    });
  });

  return out;
};

const energyPrefix = (signal: Float32Array) => {
  const prefix = new Float64Array(signal.length + 1);

  signal.forEach((value, i) => {
    prefix[i + 1] = (prefix[i] ?? 0) + value * value;
  });

  return prefix;
};

/** Normalised correlation of the template against the signal at each lag. */
const correlateWindow = (
  signal: Float32Array,
  energy: Float64Array,
  template: Float32Array,
  from: number,
  to: number,
) => {
  const templateNorm = Math.sqrt(template.reduce((s, v) => s + v * v, 0));
  const scores: number[] = [];

  for (let lag = from; lag <= to; lag += 1) {
    let dot = 0;

    for (let i = 0; i < template.length; i += 1) {
      dot += (signal[lag + i] ?? 0) * (template[i] ?? 0);
    }

    const segmentNorm = Math.sqrt(
      (energy[Math.min(signal.length, lag + template.length)] ?? 0) -
        (energy[lag] ?? 0),
    );

    scores.push(segmentNorm > 0 ? dot / (segmentNorm * templateNorm) : 0);
  }

  return scores;
};

/** Sub-sample position of a peak, from the parabola through its neighbours. */
const refinePeak = (scores: readonly number[], index: number) => {
  const left = scores[index - 1];
  const right = scores[index + 1];
  const centre = scores[index] ?? 0;

  if (left === undefined || right === undefined) {
    return index;
  }

  const denominator = left - 2 * centre + right;

  return denominator === 0
    ? index
    : index + (0.5 * (left - right)) / denominator;
};

/**
 * Where one click arrived inside a window, in samples from the window start,
 * or `null`. An echo or double click arrives later, so the earliest peak that
 * is strong enough wins.
 */
const findArrival = (scores: readonly number[]): number | null => {
  const strongest = Math.max(0, ...scores);

  if (strongest < MIN_CORRELATION) {
    return null;
  }

  const floor = Math.max(MIN_CORRELATION, strongest * EARLIEST_PEAK_SHARE);
  const peak = scores.findIndex((score, i) => {
    return (
      score >= floor &&
      score >= (scores[i - 1] ?? 0) &&
      score >= (scores[i + 1] ?? 0)
    );
  });

  return peak < 0 ? null : refinePeak(scores, peak);
};

export type MeasureClickLatencyOptions = {
  /** The microphone signal, starting at the same instant the schedule counts from. */
  recorded: Float32Array;
  sampleRate: number;
  /** When each click was scheduled to leave the output, in milliseconds. */
  scheduledMs: readonly number[];
  /** The longest latency worth looking for after a scheduled time. */
  windowMs?: number;
};

export const measureClickLatency = (
  options: MeasureClickLatencyOptions,
): ClickCalibrationResult => {
  const { recorded, sampleRate, scheduledMs } = options;
  const window = Math.round(
    ((options.windowMs ?? DEFAULT_WINDOW_MS) / MS_PER_SECOND) * sampleRate,
  );
  const template = createClickTemplate(sampleRate);
  const energy = energyPrefix(recorded);
  const latencies = scheduledMs.flatMap((scheduled, index) => {
    const from = Math.round((scheduled / MS_PER_SECOND) * sampleRate);
    // A window never reaches the next scheduled click, so a click that was
    // not heard cannot be mistaken for its neighbour.
    const nextScheduled = scheduledMs[index + 1];
    const nextStart =
      nextScheduled === undefined
        ? Number.POSITIVE_INFINITY
        : Math.round((nextScheduled / MS_PER_SECOND) * sampleRate) - 1;
    const to = Math.min(
      from + window,
      nextStart,
      recorded.length - template.length,
    );

    if (to <= from) {
      return [];
    }

    const arrival = findArrival(
      correlateWindow(recorded, energy, template, from, to),
    );

    return arrival === null ? [] : [(arrival / sampleRate) * MS_PER_SECOND];
  });
  const total = scheduledMs.length;

  if (latencies.length < MIN_FOUND_CLICKS) {
    return { ok: false, reason: 'not-heard', found: latencies.length, total };
  }

  const centre = median(latencies);
  const spread = Math.max(...latencies.map((v) => Math.abs(v - centre)));

  return spread > MAX_CLICK_SPREAD_MS
    ? { ok: false, reason: 'inconsistent', found: latencies.length, total }
    : { ok: true, latencyMs: centre, found: latencies.length, total };
};
