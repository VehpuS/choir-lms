import {
  combineStemPeakColumns,
  getWaveformPeakGain,
  layStemsOnTimeline,
  type StemPeakColumns,
  type WaveformPeaks,
} from '@org/audio-library-models';

/**
 * The composite waveform's two steps (design Decision 8): lay each stem's peaks
 * on the composite timeline once, then recombine with the current gains on
 * every mix change. The bars are scaled by the gain of the full mix (every stem
 * at its normal level), not by the combination itself, so muting or lowering
 * stems visibly lowers the waveform instead of being normalised away.
 */

export type LaidStemPeaks = {
  stemIds: string[];
  durationMs: number;
  columns: StemPeakColumns[];
  /** Brings the loudest point of the full mix to full bar height. */
  referenceGain: number;
};

export type CompositeWaveform = {
  peaks: WaveformPeaks;
  gain: number;
};

export const layCompositeStemPeaks = (
  stems: ReadonlyArray<{
    stemId: string;
    offsetMs: number;
    peaks: WaveformPeaks | null;
  }>,
): LaidStemPeaks | null => {
  const withPeaks = stems.flatMap((stem) =>
    stem.peaks ? [{ ...stem, peaks: stem.peaks }] : [],
  );
  const laid = layStemsOnTimeline(withPeaks);

  if (!laid) {
    return null;
  }

  const full = combineStemPeakColumns(
    laid.columns,
    laid.columns.map(() => 1),
    laid.durationMs,
  );

  return {
    stemIds: withPeaks.map((stem) => stem.stemId),
    durationMs: laid.durationMs,
    columns: laid.columns,
    referenceGain: full ? getWaveformPeakGain(full) : 1,
  };
};

export const combineCompositeWaveform = (
  laid: LaidStemPeaks,
  gains: Readonly<Record<string, number>>,
): CompositeWaveform | null => {
  const peaks = combineStemPeakColumns(
    laid.columns,
    laid.stemIds.map((stemId) => gains[stemId] ?? 0),
    laid.durationMs,
  );

  return peaks ? { peaks, gain: laid.referenceGain } : null;
};
