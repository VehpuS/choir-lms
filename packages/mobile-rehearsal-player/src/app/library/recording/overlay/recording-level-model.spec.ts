import assert from 'node:assert/strict';
import { describe, it } from 'node:test';

import {
  canSaveMixAsDefault,
  describeLevel,
  formatLevelDb,
} from './recording-level-model.js';

describe('formatLevelDb', () => {
  it('shows the sign, half decibels and a plain 0 dB', () => {
    assert.equal(formatLevelDb(0), '0 dB');
    assert.equal(formatLevelDb(6), '+6 dB');
    assert.equal(formatLevelDb(2.5), '+2.5 dB');
    assert.equal(formatLevelDb(-3), '−3 dB');
  });

  it('keeps an out-of-range level inside the range', () => {
    assert.equal(formatLevelDb(40), '+18 dB');
    assert.equal(formatLevelDb(-40), '−12 dB');
    assert.equal(formatLevelDb(Number.NaN), '0 dB');
  });
});

describe('describeLevel', () => {
  it('says as recorded at 0 and louder or quieter otherwise', () => {
    assert.equal(describeLevel(0), 'As recorded');
    assert.equal(describeLevel(6), '6 decibels louder');
    assert.equal(describeLevel(-2.5), '2.5 decibels quieter');
  });
});

describe('canSaveMixAsDefault', () => {
  const saved = { balance: 50, levelDb: 0 };

  it('is false while both match what is saved', () => {
    assert.equal(canSaveMixAsDefault(saved, saved), false);
  });

  it('is true when either the balance or the level moved', () => {
    assert.equal(canSaveMixAsDefault({ balance: 70, levelDb: 0 }, saved), true);
    assert.equal(canSaveMixAsDefault({ balance: 50, levelDb: 4 }, saved), true);
  });

  it('is false for a level that only differs below what is kept', () => {
    assert.equal(
      canSaveMixAsDefault({ balance: 50, levelDb: 0.04 }, saved),
      false,
    );
  });
});
