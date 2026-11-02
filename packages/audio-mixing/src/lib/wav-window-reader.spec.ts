import assert from 'node:assert/strict';
import { describe, it } from 'node:test';

import { encodeWavHeader, int16ToBytes } from './wav.ts';
import { createWavWindowReader, type BlobLike } from './wav-window-reader.ts';

const toBlobLike = (bytes: Uint8Array): BlobLike => ({
  size: bytes.length,
  slice: (start, end) => ({
    arrayBuffer: async () => {
      const part = bytes.slice(start, end);

      return part.buffer.slice(
        part.byteOffset,
        part.byteOffset + part.byteLength,
      );
    },
  }),
});

const buildWav = (samples: number[], sampleRate = 8000) => {
  const data = int16ToBytes(Int16Array.from(samples));
  const header = encodeWavHeader({ sampleRate, channels: 1 }, samples.length);
  const bytes = new Uint8Array(header.length + data.length);

  bytes.set(header, 0);
  bytes.set(data, header.length);

  return bytes;
};

describe('wav window reader', () => {
  it('reads the format and length from the header alone', async () => {
    const reader = await createWavWindowReader(
      toBlobLike(buildWav([0, 100, 200, 300], 8000)),
    );

    assert.equal(reader.sampleRate, 8000);
    assert.equal(reader.sampleCount, 4);
    assert.equal(reader.durationMs, 0.5);
  });

  it('reads just the requested samples as floats', async () => {
    const reader = await createWavWindowReader(
      toBlobLike(buildWav([0, 16383, -16384, 32767, 0])),
    );
    const window = await reader.read(1, 3);

    assert.equal(window.length, 3);
    assert.ok(Math.abs((window[0] ?? 0) - 0.5) < 0.001);
    assert.ok(Math.abs((window[1] ?? 0) + 0.5) < 0.001);
    assert.equal(window[2], 1);
  });

  it('clamps a window that runs past the end', async () => {
    const reader = await createWavWindowReader(toBlobLike(buildWav([1, 2, 3])));

    assert.equal((await reader.read(2, 100)).length, 1);
    assert.equal((await reader.read(50, 10)).length, 0);
  });

  it('refuses a blob that is not a mono WAV', async () => {
    await assert.rejects(createWavWindowReader(toBlobLike(new Uint8Array(10))));
    await assert.rejects(
      createWavWindowReader(toBlobLike(new Uint8Array(100))),
    );
  });
});
