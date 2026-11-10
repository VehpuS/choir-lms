import assert from 'node:assert/strict';
import { describe, it } from 'node:test';

import { buildToneWav } from './tone-wav';

const HEADER_BYTES = 44;
const SAMPLE_RATE_OFFSET = 24;

const readSamples = (wav: Buffer): number[] =>
  Array.from({ length: (wav.length - HEADER_BYTES) / 2 }, (_, index) =>
    wav.readInt16LE(HEADER_BYTES + index * 2),
  );

const countRisingZeroCrossings = (samples: number[]): number =>
  samples.filter(
    (sample, index) => index > 0 && samples[index - 1] < 0 && sample >= 0,
  ).length;

describe('buildToneWav', () => {
  it('writes a PCM WAV header for the requested length', () => {
    const wav = buildToneWav({ sampleRate: 8000, seconds: 2 });

    assert.equal(wav.subarray(0, 4).toString('latin1'), 'RIFF');
    assert.equal(wav.subarray(8, 12).toString('latin1'), 'WAVE');
    assert.equal(wav.readUInt32LE(SAMPLE_RATE_OFFSET), 8000);
    assert.equal(wav.length, HEADER_BYTES + 2 * 8000 * 2);
    assert.equal(wav.readUInt32LE(4), wav.length - 8);
  });

  it('plays the requested pitch', () => {
    const wav = buildToneWav({ hz: 220, sampleRate: 8000, seconds: 1 });

    // One rising zero crossing per cycle.
    assert.ok(Math.abs(countRisingZeroCrossings(readSamples(wav)) - 220) <= 1);
  });

  it('stays within the requested amplitude without clipping', () => {
    const peak = Math.max(
      ...readSamples(buildToneWav({ amplitude: 0.25, seconds: 0.1 })).map(
        Math.abs,
      ),
    );

    assert.ok(peak > 0.24 * 0x7fff && peak < 0.26 * 0x7fff);
  });
});
