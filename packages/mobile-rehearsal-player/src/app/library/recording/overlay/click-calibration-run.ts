import { measureClickLatency } from '@org/audio-mixing';
import { clamp, round } from 'es-toolkit';

import { MAX_NUDGE_MS } from '@org/audio-library-models';
import type {
  PcmBlock,
  PcmSource,
  PcmSourceFailure,
} from '../../pitch/pcm-source-types';
import { toPcmSourceError } from '../../pitch/microphone-errors';
import { MAX_DEVICE_LATENCY_MS } from './recording-sync-model';

/**
 * Runs the click calibration (rehearsal-recording design Decision 3): listen
 * to the microphone, play a few clicks through the output, and find them in
 * what was heard. The round trip it measures is the delay between the output
 * being handed a sound and the microphone capturing it, which is exactly how
 * late a singer's voice is filed against the track; both ends use the same
 * wall clock mapping a recording uses, so their errors cancel.
 */

export const CLICK_COUNT = 5;
export const CLICK_SPACING_MS = 400;
/** Lead-in so capture is already running when the first click is due. */
export const FIRST_CLICK_MS = 600;
/** Time left after the last click for its sound to come back. */
export const TAIL_MS = 700;

/** The output side, kept small so the run can be specced with a fake. */
export type ClickOutput = {
  /**
   * Hands the output a click at each offset (milliseconds from now) and
   * returns when each was handed over on the `performance.now()` clock.
   */
  schedule: (offsetsMs: readonly number[]) => Promise<number[]>;
  /** Silences any click still waiting. */
  cancel: () => void;
};

export type CalibrationFailure =
  | 'not-heard'
  | 'inconsistent'
  | 'no-clock'
  | PcmSourceFailure;

export type CalibrationOutcome =
  | { kind: 'measured'; latencyMs: number }
  | { kind: 'failed'; reason: CalibrationFailure }
  | { kind: 'cancelled' };

export type RunClickCalibrationOptions = {
  source: PcmSource;
  output: ClickOutput;
  signal?: AbortSignal;
  /** Waits; replaced in specs so they do not sleep. */
  delay?: (ms: number) => Promise<void>;
};

const defaultDelay = (ms: number) =>
  new Promise<void>((resolve) => setTimeout(resolve, ms));

/** Joins contiguous blocks into one signal that starts at the first block's wall time. */
const joinBlocks = (blocks: readonly PcmBlock[]) => {
  const first = blocks[0];

  if (!first || blocks.some((block) => block.wallStartMs === undefined)) {
    return null;
  }

  const total = blocks.reduce((sum, block) => sum + block.samples.length, 0);
  const recorded = new Float32Array(total);
  let offset = 0;

  blocks.forEach((block) => {
    recorded.set(block.samples, offset);
    offset += block.samples.length;
  });

  return {
    recorded,
    sampleRate: first.sampleRate,
    startWallMs: first.wallStartMs ?? 0,
  };
};

/** Keeps a measured delay inside what a device default may hold, in whole milliseconds. */
const toDeviceLatency = (latencyMs: number) =>
  round(clamp(latencyMs, -MAX_NUDGE_MS, MAX_DEVICE_LATENCY_MS));

export const runClickCalibration = async (
  options: RunClickCalibrationOptions,
): Promise<CalibrationOutcome> => {
  const { source, output, signal } = options;
  const delay = options.delay ?? defaultDelay;
  const blocks: PcmBlock[] = [];
  let unsubscribe: (() => void) | null = null;

  try {
    unsubscribe = await source.subscribe({
      onBlock: (block) => blocks.push(block),
    });
  } catch (error) {
    return { kind: 'failed', reason: toPcmSourceError(error).reason };
  }

  try {
    const offsets = Array.from(
      { length: CLICK_COUNT },
      (_, i) => FIRST_CLICK_MS + i * CLICK_SPACING_MS,
    );
    const wallStarts = await output.schedule(offsets);

    const cancelled = new Promise<void>((resolve) =>
      signal?.addEventListener('abort', () => resolve(), { once: true }),
    );

    await Promise.race([
      delay(offsets[offsets.length - 1] + TAIL_MS),
      cancelled,
    ]);

    if (signal?.aborted) {
      return { kind: 'cancelled' };
    }

    const heard = joinBlocks(blocks);

    // Without a wall time for the capture there is nothing to measure against.
    if (!heard) {
      return { kind: 'failed', reason: 'no-clock' };
    }

    const result = measureClickLatency({
      recorded: heard.recorded,
      sampleRate: heard.sampleRate,
      scheduledMs: wallStarts.map((wall) => wall - heard.startWallMs),
    });

    return result.ok
      ? { kind: 'measured', latencyMs: toDeviceLatency(result.latencyMs) }
      : { kind: 'failed', reason: result.reason };
  } finally {
    output.cancel();
    unsubscribe();
  }
};
