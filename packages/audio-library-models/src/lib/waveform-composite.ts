import {
  getPeakBucketCount,
  WAVEFORM_PEAKS_FORMAT_VERSION,
  type WaveformPeaks,
} from './waveform-peaks.ts';

/**
 * The composite waveform follows the mix (composite-tracks design Decision 8).
 * Peaks are kept per stem; the stem columns are laid on the composite's
 * timeline once, and a gain change only recombines them. The result is an
 * approximation of the mix, not a measurement: stems are mostly incoherent
 * voices, so squares add (`sqrt(Σ (gain × peak)²)`) rather than amplitudes.
 */

const MAX_BUCKET_VALUE = 255;
const MS_PER_SECOND = 1000;

export type StemPeaksInput = {
  peaks: WaveformPeaks;
  /** Later when positive, earlier when negative, as on the stem record. */
  offsetMs: number;
};

/** A stem's peaks (0 to 1) on the composite's timeline, one value per composite bucket. */
export type StemPeakColumns = Float32Array;

export const getCompositePeakDurationMs = (
  stems: readonly StemPeaksInput[],
): number => {
  return Math.max(
    0,
    ...stems.map((stem) => Math.max(0, stem.offsetMs + stem.peaks.durationMs)),
  );
};

/**
 * Lays one stem's buckets on a timeline of `bucketCount` buckets spanning
 * `compositeDurationMs`, keeping the loudest source bucket under each column.
 * Columns outside the stem (before a positive offset, after its end, or the
 * trimmed start of a negative offset) are 0, so a shorter stem is silent.
 */
export const layStemPeaksOnTimeline = (
  stem: StemPeaksInput,
  compositeDurationMs: number,
  bucketCount: number,
): StemPeakColumns => {
  const columns = new Float32Array(bucketCount);
  const { buckets, durationMs } = stem.peaks;

  if (bucketCount === 0 || compositeDurationMs <= 0 || buckets.length === 0) {
    return columns;
  }

  for (let column = 0; column < bucketCount; column += 1) {
    const startMs =
      (column * compositeDurationMs) / bucketCount - stem.offsetMs;
    const endMs =
      ((column + 1) * compositeDurationMs) / bucketCount - stem.offsetMs;
    const from = Math.max(0, startMs);
    const to = Math.min(durationMs, endMs);

    if (to <= from) {
      continue;
    }

    const first = Math.min(
      buckets.length - 1,
      Math.floor((from / durationMs) * buckets.length),
    );
    const last = Math.min(
      buckets.length,
      Math.max(first + 1, Math.ceil((to / durationMs) * buckets.length)),
    );
    let peak = 0;

    for (let index = first; index < last; index += 1) {
      peak = Math.max(peak, buckets[index]);
    }

    columns[column] = peak / MAX_BUCKET_VALUE;
  }

  return columns;
};

/** The cached part: every stem laid on the composite timeline, done once per set of stems. */
export const layStemsOnTimeline = (
  stems: readonly StemPeaksInput[],
): { durationMs: number; columns: StemPeakColumns[] } | null => {
  const durationMs = getCompositePeakDurationMs(stems);
  const bucketCount = getPeakBucketCount(durationMs / MS_PER_SECOND);

  if (bucketCount === 0) {
    return null;
  }

  return {
    durationMs,
    columns: stems.map((stem) =>
      layStemPeaksOnTimeline(stem, durationMs, bucketCount),
    ),
  };
};

/**
 * The cheap pass run on every gain change: `sqrt(Σ (gain × peak)²)` per
 * column, clipped to 1. `gains` lines up with `columns`; a gain of 0 (muted or
 * not soloed) leaves that stem out.
 */
export const combineStemPeakColumns = (
  columns: readonly StemPeakColumns[],
  gains: readonly number[],
  durationMs: number,
): WaveformPeaks | null => {
  const bucketCount = columns[0]?.length ?? 0;

  if (bucketCount === 0 || durationMs <= 0) {
    return null;
  }

  const buckets = new Uint8Array(bucketCount);

  for (let index = 0; index < bucketCount; index += 1) {
    let sumOfSquares = 0;

    for (let stem = 0; stem < columns.length; stem += 1) {
      const scaled = (gains[stem] ?? 0) * (columns[stem][index] ?? 0);

      sumOfSquares += scaled * scaled;
    }

    buckets[index] = Math.round(
      Math.min(1, Math.sqrt(sumOfSquares)) * MAX_BUCKET_VALUE,
    );
  }

  return {
    buckets,
    durationMs: Math.round(durationMs),
    formatVersion: WAVEFORM_PEAKS_FORMAT_VERSION,
  };
};

/** Both steps in one call, for a one-off combination. */
export const combineStemWaveforms = (
  stems: readonly (StemPeaksInput & { gain: number })[],
): WaveformPeaks | null => {
  const laid = layStemsOnTimeline(stems);

  return laid
    ? combineStemPeakColumns(
        laid.columns,
        stems.map((stem) => stem.gain),
        laid.durationMs,
      )
    : null;
};
