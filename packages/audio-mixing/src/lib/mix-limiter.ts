/**
 * Peak limiting for the recording's mix (rehearsal-recording design Decision
 * 21). A boosted recording over a loud track can pass full scale, so the live
 * overlay and the exported mix both end in the same ceiling curve: straight up
 * to a knee, then a smooth roll-off that stays under full scale. The overlay
 * runs the browser's compressor in front of the curve; the offline render has
 * `createMixLimiter` in front of it, a small peak limiter that works on plain
 * samples so a render is repeatable and needs no audio context.
 */

/** The curve is the identity below this, so ordinary levels are untouched. */
export const CEILING_KNEE = 0.8;
/** How far above the knee the curve can still rise; the loudest output is `CEILING_KNEE + CEILING_HEADROOM * tanh(...)`, under 1. */
export const CEILING_HEADROOM = 0.18;
export const CEILING_CURVE_SIZE = 4096;

/** One sample through the ceiling: straight to the knee, then rolled off, never reaching full scale. */
export const applyCeiling = (sample: number): number => {
  const magnitude = Math.abs(sample);

  if (magnitude <= CEILING_KNEE) {
    return sample;
  }

  return (
    Math.sign(sample) *
    (CEILING_KNEE +
      CEILING_HEADROOM *
        Math.tanh((magnitude - CEILING_KNEE) / CEILING_HEADROOM))
  );
};

/**
 * The ceiling as a lookup table for a `WaveShaperNode`, which clamps anything
 * beyond its input range to the table's end, so the end value is the hard ceiling.
 */
export const createCeilingCurve = (
  size: number = CEILING_CURVE_SIZE,
): Float32Array => {
  const curve = new Float32Array(size);

  for (let index = 0; index < size; index += 1) {
    curve[index] = applyCeiling((index / (size - 1)) * 2 - 1);
  }

  return curve;
};

/** Where the offline limiter starts pulling the level down, just above the knee. */
export const MIX_LIMITER_THRESHOLD = 0.84;
/** Seconds for the gain to recover once a peak has passed. */
export const MIX_LIMITER_RELEASE_S = 0.12;

export type MixLimiter = {
  /** Limits interleaved frames in place, keeping the gain it ends on for the next call. */
  process: (interleaved: Float32Array, channels: number) => void;
};

export const createMixLimiter = (sampleRate: number): MixLimiter => {
  const releaseStep =
    1 - Math.exp(-1 / Math.max(1, MIX_LIMITER_RELEASE_S * sampleRate));
  let gain = 1;

  return {
    process: (interleaved, channels) => {
      const frames = Math.floor(interleaved.length / channels);

      for (let frame = 0; frame < frames; frame += 1) {
        const base = frame * channels;
        let peak = 0;

        // The loudest channel sets the gain for all of them, so the stereo image holds.
        for (let channel = 0; channel < channels; channel += 1) {
          peak = Math.max(peak, Math.abs(interleaved[base + channel] ?? 0));
        }

        const wanted =
          peak > MIX_LIMITER_THRESHOLD ? MIX_LIMITER_THRESHOLD / peak : 1;

        gain = wanted < gain ? wanted : gain + (1 - gain) * releaseStep;

        for (let channel = 0; channel < channels; channel += 1) {
          interleaved[base + channel] = applyCeiling(
            (interleaved[base + channel] ?? 0) * gain,
          );
        }
      }
    },
  };
};
