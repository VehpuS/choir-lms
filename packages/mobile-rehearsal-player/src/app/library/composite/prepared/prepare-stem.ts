import {
  computeWaveformPeaks,
  type WaveformPeaks,
} from '@org/audio-library-models';
import { floatToInt16 } from '@org/audio-mixing';

import { createAbortError } from '../../playback/utils/saved-track-blob-download';
import { mixDownToMono, resampleLinear } from './prepare-stem-signal';
import type { DecodedStem } from './prepare-stem-signal';
import type { PreparedStemKey, PreparedStemStore } from './prepared-stem-types';

const MS_PER_SECOND = 1000;
const NO_PROGRESS = 0;
const FULL_PROGRESS = 1;
/** About a second and a half at 44.1 kHz: small writes, few yields. */
export const DEFAULT_PREPARE_CHUNK_SAMPLES = 65_536;

export type PrepareStemOptions = {
  store: PreparedStemStore;
  key: PreparedStemKey;
  /** The audio context's rate; the stem is stored at it. */
  targetSampleRate: number;
  /** Decodes the stem's audio. Called once, so only this stem is decoded at a time. */
  decode: (signal: AbortSignal | undefined) => Promise<DecodedStem>;
  signal?: AbortSignal;
  /** 0 to 1 over the writing; 1 once the stem is stored. */
  onProgress?: (fraction: number) => void;
  chunkSamples?: number;
  /** Lets the page paint between chunks; the default waits one macrotask. */
  yieldToEventLoop?: () => Promise<void>;
};

export type PreparedStemSummary = {
  sampleCount: number;
  durationMs: number;
  /** For the composite waveform; null when the stem is silent or too short to draw. */
  peaks: WaveformPeaks | null;
};

const defaultYield = () =>
  new Promise<void>((resolve) => {
    setTimeout(resolve, 0);
  });

const throwIfAborted = (signal: AbortSignal | undefined) => {
  if (signal?.aborted) {
    throw createAbortError();
  }
};

/**
 * Prepares one stem (composite-tracks design Decision 9): decode, mix down to
 * mono, bring to the context rate and write 16-bit chunks to the store. Only
 * the stem being prepared is held, and a failed or cancelled stem leaves
 * nothing readable behind.
 */
export const prepareStem = async (
  options: PrepareStemOptions,
): Promise<PreparedStemSummary> => {
  const { store, key, targetSampleRate, signal } = options;
  const chunkSamples = options.chunkSamples ?? DEFAULT_PREPARE_CHUNK_SAMPLES;
  const yieldToEventLoop = options.yieldToEventLoop ?? defaultYield;

  throwIfAborted(signal);
  options.onProgress?.(NO_PROGRESS);

  const decoded = await options.decode(signal);

  throwIfAborted(signal);

  const mono = resampleLinear(
    mixDownToMono(decoded.channels),
    decoded.sampleRate,
    targetSampleRate,
  );

  if (mono.length === 0) {
    throw new Error('The stem has no audio.');
  }

  const writer = await store.begin(key, { sampleRate: targetSampleRate });

  try {
    for (let start = 0; start < mono.length; start += chunkSamples) {
      throwIfAborted(signal);
      await writer.write(
        floatToInt16(mono.subarray(start, start + chunkSamples)),
      );
      options.onProgress?.(
        Math.min(start + chunkSamples, mono.length) / mono.length,
      );
      await yieldToEventLoop();
    }

    throwIfAborted(signal);
    await writer.finish();
  } catch (error) {
    // Cancelled, or the device is full: remove the part so nothing half-written stays.
    await writer.abort().catch(() => undefined);
    throw error;
  }

  options.onProgress?.(FULL_PROGRESS);

  return {
    sampleCount: mono.length,
    durationMs: (mono.length / targetSampleRate) * MS_PER_SECOND,
    peaks: computeWaveformPeaks([mono], targetSampleRate),
  };
};
