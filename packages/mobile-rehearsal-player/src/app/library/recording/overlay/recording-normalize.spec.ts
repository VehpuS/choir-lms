import assert from 'node:assert/strict';
import { describe, it } from 'node:test';

import { encodeWavParts } from '@org/audio-mixing';

import { normalizeRecording } from './recording-normalize.js';

const SAMPLE_RATE = 44_100;
const toBlob = (samples: Int16Array) => {
  const parts = encodeWavParts([samples], {
    channels: 1,
    sampleRate: SAMPLE_RATE,
  });

  return new (Blob as unknown as new (parts: unknown[]) => Blob)(parts);
};

/** One second whose loudest sample is `peak` of full scale. */
const withPeak = (peak: number) => {
  const samples = new Int16Array(SAMPLE_RATE).fill(
    Math.round(peak * 0.2 * 32767),
  );

  samples[1234] = Math.round(peak * 32767);

  return toBlob(samples);
};

const deps = (blob: Blob | null) => ({ getWavBlob: async () => blob });

describe('normalizeRecording', () => {
  it('suggests the level that puts the loudest sample at -1 dBFS', async () => {
    const outcome = await normalizeRecording('a', deps(withPeak(0.5)));

    assert.equal(outcome.status, 'set');
    assert.equal(outcome.status === 'set' ? outcome.levelDb : null, 5);
    assert.equal(outcome.status === 'set' ? outcome.message : 'x', undefined);
  });

  it('says so when the range ran out and the recording is still quiet', async () => {
    const outcome = await normalizeRecording('a', deps(withPeak(0.01)));

    assert.equal(outcome.status === 'set' ? outcome.levelDb : null, 18);
    assert.match(
      outcome.status === 'set' ? (outcome.message ?? '') : '',
      /as far as it goes/,
    );
  });

  it('lowers a clipped recording', async () => {
    const outcome = await normalizeRecording('a', deps(withPeak(1)));

    assert.equal(outcome.status === 'set' ? outcome.levelDb : null, -1);
  });

  it('leaves a silent recording alone and says there is nothing to raise', async () => {
    const outcome = await normalizeRecording(
      'a',
      deps(toBlob(new Int16Array(SAMPLE_RATE))),
    );

    assert.equal(outcome.status, 'unchanged');
    assert.match(
      outcome.status === 'unchanged' ? outcome.message : '',
      /no sound/,
    );
  });

  it('reports a recording whose audio is missing or unreadable instead of throwing', async () => {
    const missing = await normalizeRecording('a', deps(null));
    const broken = await normalizeRecording('a', {
      createReader: async () => {
        throw new Error('bad');
      },
      getWavBlob: async () => withPeak(0.5),
    });

    assert.equal(missing.status, 'unchanged');
    assert.equal(broken.status, 'unchanged');
  });

  it('stops without a level when the scan is aborted', async () => {
    const outcome = await normalizeRecording('a', deps(withPeak(0.5)), {
      aborted: true,
    });

    assert.equal(outcome.status, 'aborted');
  });
});
