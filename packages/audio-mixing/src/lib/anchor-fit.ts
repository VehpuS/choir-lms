/**
 * Maps the media element's clock to wall-clock time (rehearsal-recording
 * design Decision 2). The element's `currentTime` is sampled together with
 * `performance.now()`; a least-squares line over the samples of one
 * uninterrupted stretch gives track position as a function of wall time with
 * the sampling jitter averaged out.
 */

export type ClockAnchor = {
  /** Wall-clock time of the sample, in milliseconds. */
  wallMs: number;
  /** The track position read at that moment, in milliseconds. */
  trackMs: number;
};

export type AnchorFit = {
  /** Track position at a wall-clock time, extrapolating outside the samples. */
  trackAt: (wallMs: number) => number;
  /** Track milliseconds per wall millisecond; the playback rate when not held. */
  slope: number;
  /** Root-mean-square distance of the samples from the line, in milliseconds. */
  residualMs: number;
};

const MIN_FREE_FIT_ANCHORS = 2;

const mean = (values: readonly number[]) => {
  return values.reduce((sum, value) => sum + value, 0) / values.length;
};

const toResidual = (
  anchors: readonly ClockAnchor[],
  trackAt: (wallMs: number) => number,
) => {
  const squares = anchors.map((a) => (trackAt(a.wallMs) - a.trackMs) ** 2);

  return Math.sqrt(mean(squares));
};

/**
 * Fits one stretch. With `knownRate` the slope is fixed and only the offset is
 * fitted, which is the normal case because the rate is constant for a
 * recording; without it the slope is fitted too. Returns `null` when there is
 * nothing to fit.
 */
export const fitClockAnchors = (
  anchors: readonly ClockAnchor[],
  knownRate?: number,
): AnchorFit | null => {
  if (anchors.length === 0) {
    return null;
  }

  // Centre the wall clock on its mean so large `performance.now()` values do
  // not cost precision in the sums.
  const centre = mean(anchors.map((a) => a.wallMs));
  const meanTrack = mean(anchors.map((a) => a.trackMs));
  let slope = knownRate ?? 0;

  if (knownRate === undefined) {
    if (anchors.length < MIN_FREE_FIT_ANCHORS) {
      return null;
    }

    const sxx = anchors.reduce((s, a) => s + (a.wallMs - centre) ** 2, 0);
    const sxy = anchors.reduce(
      (s, a) => s + (a.wallMs - centre) * (a.trackMs - meanTrack),
      0,
    );

    if (sxx === 0) {
      return null;
    }

    slope = sxy / sxx;
  }

  const trackAt = (wallMs: number) => meanTrack + slope * (wallMs - centre);

  return { trackAt, slope, residualMs: toResidual(anchors, trackAt) };
};

/**
 * Splits anchors into stretches: a new one starts wherever the track position
 * moved by something other than the rate predicts (a seek or a loop wrap).
 * Pauses are the caller's business, since a paused element reports no motion.
 */
export const splitStretches = (
  anchors: readonly ClockAnchor[],
  rate: number,
  toleranceMs: number,
): ClockAnchor[][] => {
  const stretches: ClockAnchor[][] = [];

  anchors.forEach((anchor, index) => {
    const previous = anchors[index - 1];
    const expected = previous
      ? previous.trackMs + rate * (anchor.wallMs - previous.wallMs)
      : anchor.trackMs;

    if (!previous || Math.abs(anchor.trackMs - expected) > toleranceMs) {
      stretches.push([anchor]);
      return;
    }

    stretches[stretches.length - 1]?.push(anchor);
  });

  return stretches;
};
