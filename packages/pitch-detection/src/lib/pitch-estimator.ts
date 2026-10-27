import { PitchDetector } from 'pitchy';

export type PitchEstimate = {
  frequencyHz: number;
  /** 0..1; how periodic the frame is (1 is a pure tone). */
  clarity: number;
};

/**
 * One frame of mono samples in, the dominant fundamental out. Everything above
 * this interface (gates, smoothing, segmenting) is estimator-agnostic, so a
 * different algorithm is a one-file swap.
 */
export type PitchEstimator = {
  estimate: (frame: Float32Array, sampleRate: number) => PitchEstimate | null;
};

/** A McLeod pitch method estimator backed by pitchy. */
export const createPitchyEstimator = (): PitchEstimator => {
  // pitchy sizes its buffers for one frame length, so keep one per length.
  const detectors = new Map<number, PitchDetector<Float32Array>>();

  return {
    estimate: (frame, sampleRate) => {
      if (frame.length === 0) {
        return null;
      }

      let detector = detectors.get(frame.length);

      if (!detector) {
        detector = PitchDetector.forFloat32Array(frame.length);
        detectors.set(frame.length, detector);
      }

      const [frequencyHz, clarity] = detector.findPitch(frame, sampleRate);

      if (!(frequencyHz > 0) || !Number.isFinite(frequencyHz)) {
        return null;
      }

      return { frequencyHz, clarity };
    },
  };
};
