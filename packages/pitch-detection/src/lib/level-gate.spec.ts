import assert from 'node:assert/strict';
import { describe, it } from 'node:test';

import {
  clampLevelCutoffDb,
  frameLevelDb,
  MAX_LEVEL_CUTOFF_DB,
  MIN_LEVEL_CUTOFF_DB,
  rmsToDb,
  SILENCE_DB,
} from './level-gate.ts';

describe('rmsToDb', () => {
  it('reads full scale as 0 dB and each tenth as -20 dB', () => {
    assert.equal(rmsToDb(1), 0);
    assert.ok(Math.abs(rmsToDb(0.1) + 20) < 1e-9);
    assert.ok(Math.abs(rmsToDb(0.01) + 40) < 1e-9);
  });

  it('floors silence so a meter has a bottom', () => {
    assert.equal(rmsToDb(0), SILENCE_DB);
    assert.equal(rmsToDb(1e-12), SILENCE_DB);
  });
});

describe('frameLevelDb', () => {
  it('measures a frame and treats an empty one as silence', () => {
    assert.ok(
      Math.abs(frameLevelDb(new Float32Array([0.1, -0.1])) + 20) < 1e-6,
    );
    assert.equal(frameLevelDb(new Float32Array(0)), SILENCE_DB);
  });
});

describe('clampLevelCutoffDb', () => {
  it('keeps the cutoff inside its range', () => {
    assert.equal(clampLevelCutoffDb(-90), MIN_LEVEL_CUTOFF_DB);
    assert.equal(clampLevelCutoffDb(0), MAX_LEVEL_CUTOFF_DB);
    assert.equal(clampLevelCutoffDb(-40), -40);
  });
});
