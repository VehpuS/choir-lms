import assert from 'node:assert/strict';
import { describe, it } from 'node:test';

import {
  formatDurationLabel,
  formatLengthLabel,
} from './drive-library-metadata';

describe('formatLengthLabel', () => {
  it('matches the whole-second label for a length of a second or more', () => {
    assert.equal(formatLengthLabel(1000), '0:01');
    assert.equal(formatLengthLabel(92_000), '1:32');
    assert.equal(formatLengthLabel(3_661_000), '1:01:01');
  });

  it('shows one decimal for a clip shorter than a second, so it does not read as 0:00', () => {
    assert.equal(formatLengthLabel(627), '0:00.6');
    assert.equal(formatLengthLabel(250), '0:00.3');
    assert.equal(formatLengthLabel(40), '0:00.1');
  });

  it('rounds a length just under a second up to the whole second', () => {
    assert.equal(formatLengthLabel(960), '0:01');
  });

  it('leaves an unknown or zero length to the whole-second formatter', () => {
    assert.equal(formatLengthLabel(undefined), undefined);
    assert.equal(formatLengthLabel(0), formatDurationLabel(0));
    assert.equal(formatLengthLabel(-5), undefined);
  });
});

describe('formatDurationLabel for positions', () => {
  it('keeps whole seconds so early playback does not flicker a decimal', () => {
    assert.equal(formatDurationLabel(400), '0:00');
  });
});
