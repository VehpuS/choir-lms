import { WAV_HEADER_BYTES } from './wav.ts';

/**
 * The length of an exported composite mix (composite-tracks design Decision
 * 13): the timeline is the longest stem counting offsets, shaped in time by the
 * speed, so at 0.5× the file is twice as long. A pure function of the stems'
 * placement and the output rate.
 */

const MS_PER_SECOND = 1000;
const BYTES_PER_SAMPLE = 2;

export type CompositeRenderShaping = {
  /** Speed multiplier; 1 leaves the length unchanged. */
  rate: number;
  pitchSemitones: number;
};

export type CompositePlanStem = {
  offsetMs: number;
  durationMs: number;
};

export type CompositeRenderPlan = {
  /** The unshaped timeline: the longest stem end, counting offsets. */
  timelineMs: number;
  /** The exported length after the speed is applied. */
  outputDurationMs: number;
  /** Output frames at the render's sample rate. */
  totalFrames: number;
};

export const planCompositeRender = (
  stems: readonly CompositePlanStem[],
  shaping: CompositeRenderShaping,
  outputSampleRate: number,
): CompositeRenderPlan => {
  const timelineMs = Math.max(
    0,
    ...stems.map((stem) => Math.max(0, stem.offsetMs + stem.durationMs)),
  );
  const outputDurationMs = timelineMs / shaping.rate;

  return {
    timelineMs,
    outputDurationMs,
    totalFrames: Math.round(
      (outputDurationMs * outputSampleRate) / MS_PER_SECOND,
    ),
  };
};

/** Bytes of the 16-bit mono WAV the plan would write, for the dialog's estimate. */
export const estimateCompositeWavBytes = (
  plan: Pick<CompositeRenderPlan, 'totalFrames'>,
): number => {
  return WAV_HEADER_BYTES + plan.totalFrames * BYTES_PER_SAMPLE;
};
