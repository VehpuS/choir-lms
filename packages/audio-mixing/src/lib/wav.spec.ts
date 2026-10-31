import assert from 'node:assert/strict';
import { describe, it } from 'node:test';

import {
  WAV_HEADER_BYTES,
  decodeWav,
  encodeWavHeader,
  encodeWavParts,
  floatToInt16,
  int16ToFloat,
} from './wav.ts';

const concat = (parts: Uint8Array[]) => {
  const out = new Uint8Array(parts.reduce((n, p) => n + p.length, 0));
  let offset = 0;

  parts.forEach((part) => {
    out.set(part, offset);
    offset += part.length;
  });

  return out;
};

describe('WAV encoding', () => {
  it('writes a canonical 44-byte header', () => {
    const header = encodeWavHeader({ sampleRate: 44100, channels: 1 }, 100);
    const view = new DataView(header.buffer);

    assert.equal(header.length, WAV_HEADER_BYTES);
    assert.equal(String.fromCharCode(...header.slice(0, 4)), 'RIFF');
    assert.equal(view.getUint32(4, true), 36 + 200);
    assert.equal(view.getUint32(24, true), 44100);
    assert.equal(view.getUint32(28, true), 88200);
    assert.equal(view.getUint32(40, true), 200);
  });

  it('round-trips samples across several blocks', () => {
    const blocks = [Int16Array.of(0, 1, -1), Int16Array.of(32767, -32768)];
    const bytes = concat(
      encodeWavParts(blocks, { sampleRate: 48000, channels: 1 }),
    );
    const decoded = decodeWav(bytes);

    assert.equal(decoded.ok, true);
    assert.ok(decoded.ok);
    assert.equal(decoded.wav.sampleRate, 48000);
    assert.deepEqual([...decoded.wav.samples], [0, 1, -1, 32767, -32768]);
  });

  it('clamps floats to the Int16 range and converts back approximately', () => {
    assert.deepEqual(
      [...floatToInt16(Float32Array.of(2, -2, 0, 0.5))],
      [32767, -32768, 0, 16384],
    );
    assert.ok(
      Math.abs((int16ToFloat(Int16Array.of(16384))[0] ?? 0) - 0.5) < 1e-4,
    );
  });
});

describe('WAV decoding', () => {
  const build = (
    extra: Uint8Array = new Uint8Array(0),
    claimedSamples?: number,
  ) => {
    const samples = Int16Array.of(10, 20, 30, 40);
    const [header, ...rest] = encodeWavParts([samples], {
      sampleRate: 8000,
      channels: 2,
    });
    const patched = new Uint8Array(header as Uint8Array);

    if (claimedSamples !== undefined) {
      new DataView(patched.buffer).setUint32(40, claimedSamples * 2, true);
    }

    return concat([patched.slice(0, 36), extra, patched.slice(36), ...rest]);
  };

  it('skips unknown chunks, including an odd-sized one with its pad byte', () => {
    const list = Uint8Array.of(76, 73, 83, 84, 3, 0, 0, 0, 1, 2, 3, 0);
    const decoded = decodeWav(build(list));

    assert.ok(decoded.ok);
    assert.equal(decoded.wav.channels, 2);
    assert.deepEqual([...decoded.wav.samples], [10, 20, 30, 40]);
  });

  it('clamps a data size that overruns the file', () => {
    const decoded = decodeWav(build(undefined, 1_000_000));

    assert.ok(decoded.ok);
    assert.equal(decoded.wav.samples.length, 4);
  });

  it('rejects non-WAV bytes, other formats, and a file with no data', () => {
    assert.deepEqual(decodeWav(new Uint8Array(64)), {
      ok: false,
      reason: 'not-wav',
    });

    const float = build();
    new DataView(float.buffer).setUint16(20, 3, true);
    assert.deepEqual(decodeWav(float), {
      ok: false,
      reason: 'unsupported-format',
    });

    assert.deepEqual(decodeWav(build().slice(0, 36)), {
      ok: false,
      reason: 'missing-data',
    });
  });
});
