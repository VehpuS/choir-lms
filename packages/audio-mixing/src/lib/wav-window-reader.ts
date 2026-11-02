import { decodeWav, int16ToFloat, WAV_HEADER_BYTES } from './wav.ts';

/**
 * Reads a stored recording a window at a time (rehearsal-recording design
 * Decision 5). A recording is plain 16-bit PCM, so a window is a slice of the
 * blob converted to floats: there is no decoder to run and nothing outside the
 * requested window is read or held in memory.
 */

const BYTES_PER_SAMPLE = 2;

/** The part of a `Blob` the reader needs, so it runs without a browser. */
export type BlobLike = {
  size: number;
  slice: (
    start: number,
    end: number,
  ) => { arrayBuffer: () => Promise<ArrayBuffer> };
};

export type PcmWindowReader = {
  sampleRate: number;
  sampleCount: number;
  durationMs: number;
  /** Samples `[startSample, startSample + count)`, clamped to the recording. */
  read: (startSample: number, count: number) => Promise<Float32Array>;
};

export class WavWindowError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'WavWindowError';
  }
}

export const createWavWindowReader = async (
  blob: BlobLike,
): Promise<PcmWindowReader> => {
  if (blob.size < WAV_HEADER_BYTES) {
    throw new WavWindowError('The recording has no audio.');
  }

  const header = new Uint8Array(
    await blob.slice(0, WAV_HEADER_BYTES).arrayBuffer(),
  );
  const decoded = decodeWav(header);

  if (
    !decoded.ok ||
    decoded.wav.channels !== 1 ||
    decoded.wav.sampleRate <= 0
  ) {
    throw new WavWindowError('The recording is not readable audio.');
  }

  const { sampleRate } = decoded.wav;
  const sampleCount = Math.floor(
    (blob.size - WAV_HEADER_BYTES) / BYTES_PER_SAMPLE,
  );

  return {
    sampleRate,
    sampleCount,
    durationMs: (sampleCount / sampleRate) * 1000,
    read: async (startSample, count) => {
      const start = Math.max(0, Math.min(sampleCount, Math.floor(startSample)));
      const end = Math.max(
        start,
        Math.min(sampleCount, start + Math.floor(count)),
      );
      const buffer = await blob
        .slice(
          WAV_HEADER_BYTES + start * BYTES_PER_SAMPLE,
          WAV_HEADER_BYTES + end * BYTES_PER_SAMPLE,
        )
        .arrayBuffer();

      return int16ToFloat(new Int16Array(buffer));
    },
  };
};
