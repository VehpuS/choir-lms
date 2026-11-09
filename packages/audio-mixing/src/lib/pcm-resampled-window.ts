import type { PcmWindowReader } from './wav-window-reader.ts';

/**
 * Linear-resampled samples of one reader for output frames `[chunkStart,
 * chunkEnd)`, with the reader's first sample placed at `offsetFrames` (negative
 * trims its start). Shared by the recording mix and the composite render.
 */
export const readResampledWindow = async (
  reader: PcmWindowReader,
  offsetFrames: number,
  outputSampleRate: number,
  chunkStart: number,
  chunkEnd: number,
): Promise<Float32Array> => {
  const frames = chunkEnd - chunkStart;
  const out = new Float32Array(frames);
  const step = reader.sampleRate / outputSampleRate;
  // Positions come from the absolute output frame, so a chunk boundary never
  // changes a sample.
  const positionOf = (frame: number) => (frame - offsetFrames) * step;
  const first = Math.max(0, Math.floor(positionOf(chunkStart)));
  const last = Math.min(
    reader.sampleCount,
    Math.ceil(positionOf(chunkEnd - 1)) + 2,
  );

  if (last <= first) {
    return out;
  }

  const window = await reader.read(first, last - first);

  for (let index = 0; index < frames; index += 1) {
    const position = positionOf(chunkStart + index);

    if (position < 0 || position > reader.sampleCount - 1) {
      continue;
    }

    const base = Math.floor(position);
    const fraction = position - base;
    const before = window[base - first] ?? 0;
    const after = window[base + 1 - first] ?? before;

    out[index] = before + (after - before) * fraction;
  }

  return out;
};
