import assert from 'node:assert/strict';
import { describe, it } from 'node:test';

import { nearestSample, SAMPLE_MIDIS } from './piano-samples.js';

describe('piano samples', () => {
  it('has a recording every minor third from C2 to C7', () => {
    assert.equal(SAMPLE_MIDIS.length, 21);
    assert.deepEqual(SAMPLE_MIDIS.slice(0, 4), [36, 39, 42, 45]);
    assert.equal(SAMPLE_MIDIS.at(-1), 96);
  });

  it('plays a recorded key unshifted', () => {
    assert.deepEqual(nearestSample(60), { playbackRate: 1, sampleMidi: 60 });
  });

  it('shifts a key between recordings by one semitone at most', () => {
    assert.equal(nearestSample(61).sampleMidi, 60);
    assert.equal(nearestSample(62).sampleMidi, 63);
    assert.ok(Math.abs(nearestSample(61).playbackRate - 2 ** (1 / 12)) < 1e-9);
    assert.ok(Math.abs(nearestSample(62).playbackRate - 2 ** (-1 / 12)) < 1e-9);
  });

  it('shifts the edge samples for keys beyond the recorded range', () => {
    // A0 (21) sits 15 semitones under C2; C8 (108) 12 above C7.
    assert.equal(nearestSample(21).sampleMidi, 36);
    assert.ok(
      Math.abs(nearestSample(21).playbackRate - 2 ** (-15 / 12)) < 1e-9,
    );
    assert.equal(nearestSample(108).sampleMidi, 96);
    assert.equal(nearestSample(108).playbackRate, 2);
  });
});
