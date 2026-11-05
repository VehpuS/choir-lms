import {
  CEILING_HEADROOM,
  CEILING_KNEE,
  MIX_LIMITER_RELEASE_S,
  MIX_LIMITER_THRESHOLD,
} from './mix-limiter.ts';

/**
 * The live overlay's limiter as an `AudioWorklet` processor (rehearsal-recording
 * design Decision 21, task 14.19). It runs the same peak limiter and ceiling as
 * `createMixLimiter`, sample for sample, so what is heard while playing is what
 * an exported mix contains: the browser's own compressor adds make-up gain that
 * the export has no way to match. The source is a string because a worklet is
 * loaded from a URL; the numbers come from the constants above, and a spec runs
 * it against `createMixLimiter` so the two cannot drift apart.
 */
export const MIX_LIMITER_PROCESSOR_NAME = 'recording-mix-limiter';

export const getMixLimiterWorkletSource = (): string => `
class RecordingMixLimiter extends AudioWorkletProcessor {
  constructor() {
    super();
    this.gain = 1;
    this.releaseStep = 1 - Math.exp(-1 / Math.max(1, ${MIX_LIMITER_RELEASE_S} * sampleRate));
  }

  ceiling(sample) {
    const magnitude = Math.abs(sample);

    if (magnitude <= ${CEILING_KNEE}) {
      return sample;
    }

    return Math.sign(sample) * (${CEILING_KNEE} + ${CEILING_HEADROOM} * Math.tanh((magnitude - ${CEILING_KNEE}) / ${CEILING_HEADROOM}));
  }

  process(inputs, outputs) {
    const input = inputs[0];
    const output = outputs[0];

    if (!input || input.length === 0) {
      return true;
    }

    const frames = input[0].length;

    for (let frame = 0; frame < frames; frame += 1) {
      let peak = 0;

      for (let channel = 0; channel < input.length; channel += 1) {
        peak = Math.max(peak, Math.abs(input[channel][frame]));
      }

      const wanted = peak > ${MIX_LIMITER_THRESHOLD} ? ${MIX_LIMITER_THRESHOLD} / peak : 1;

      this.gain = wanted < this.gain ? wanted : this.gain + (1 - this.gain) * this.releaseStep;

      for (let channel = 0; channel < input.length; channel += 1) {
        output[channel][frame] = this.ceiling(input[channel][frame] * this.gain);
      }
    }

    return true;
  }
}

registerProcessor('${MIX_LIMITER_PROCESSOR_NAME}', RecordingMixLimiter);
`;
