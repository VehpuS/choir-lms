import assert from 'node:assert/strict';
import { describe, it } from 'node:test';

import { pianoVolumeToGain } from './piano-voice';

describe('pianoVolumeToGain', () => {
  it('keeps the slider linear up to the old default level', () => {
    assert.equal(pianoVolumeToGain(0), 0);
    assert.equal(pianoVolumeToGain(0.5), 0.5);
    assert.equal(pianoVolumeToGain(0.7), 0.7);
  });

  it('boosts the top of the slider well past unity gain', () => {
    assert.equal(pianoVolumeToGain(1), 3);
    assert.ok(pianoVolumeToGain(0.85) > 0.7 && pianoVolumeToGain(0.85) < 3);
  });
});
