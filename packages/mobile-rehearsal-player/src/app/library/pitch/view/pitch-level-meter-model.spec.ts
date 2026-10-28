import assert from 'node:assert/strict';
import { describe, it } from 'node:test';

import {
  dbToMeterRatio,
  dragCutoffDb,
  formatDb,
  getLevelMeterModel,
  meterRatioToCutoffDb,
  METER_MAX_DB,
  METER_MIN_DB,
  stepCutoffDb,
} from './pitch-level-meter-model.js';

describe('meter position', () => {
  it('maps the ends of the meter to 0 and 1 and clamps beyond them', () => {
    assert.equal(dbToMeterRatio(METER_MIN_DB), 0);
    assert.equal(dbToMeterRatio(METER_MAX_DB), 1);
    assert.equal(dbToMeterRatio(-100), 0);
    assert.equal(dbToMeterRatio(5), 1);
  });

  it('round-trips a cutoff through its position', () => {
    assert.equal(meterRatioToCutoffDb(dbToMeterRatio(-40)), -40);
  });

  it('snaps a position to 2 dB and keeps it within the cutoff range', () => {
    assert.equal(meterRatioToCutoffDb(0), -60);
    assert.equal(meterRatioToCutoffDb(1), -20);
    // A hair past -40 dB still lands on -40.
    assert.equal(meterRatioToCutoffDb(dbToMeterRatio(-40) + 0.004), -40);
  });
});

describe('dragCutoffDb', () => {
  it('moves the cutoff by the share of the meter dragged, within range', () => {
    // The meter spans 60 dB, so a tenth of it is 6 dB.
    assert.equal(dragCutoffDb(-40, 0.1), -34);
    assert.equal(dragCutoffDb(-40, -0.1), -46);
    assert.equal(dragCutoffDb(-40, 1), -20);
    assert.equal(dragCutoffDb(-40, -1), -60);
  });
});

describe('stepCutoffDb', () => {
  it('steps by 2 dB and stops at the ends', () => {
    assert.equal(stepCutoffDb(-40, 'louder'), -38);
    assert.equal(stepCutoffDb(-40, 'quieter'), -42);
    assert.equal(stepCutoffDb(-20, 'louder'), -20);
    assert.equal(stepCutoffDb(-60, 'quieter'), -60);
  });
});

describe('formatDb', () => {
  it('uses a true minus sign', () => {
    assert.equal(formatDb(-40), '−40 dB');
    assert.equal(formatDb(0), '0 dB');
  });
});

describe('getLevelMeterModel', () => {
  const base = { cutoffDb: -40, levelDb: -30, isListening: true };

  it('shows the level and whether it is heard while listening', () => {
    const model = getLevelMeterModel(base);

    assert.ok(model.levelRatio > model.cutoffRatio);
    assert.equal(model.isHeard, true);
    assert.equal(model.hintText, null);
    assert.equal(getLevelMeterModel({ ...base, levelDb: -50 }).isHeard, false);
  });

  it('asks to start listening and draws no level while capture is off', () => {
    const model = getLevelMeterModel({ ...base, isListening: false });

    assert.equal(model.levelRatio, 0);
    assert.equal(model.isHeard, false);
    assert.equal(model.hintText, 'Start listening to see the level');
  });

  it('disables a step at either end of the range', () => {
    assert.equal(
      getLevelMeterModel({ ...base, cutoffDb: -60 }).canQuieter,
      false,
    );
    assert.equal(
      getLevelMeterModel({ ...base, cutoffDb: -20 }).canLouder,
      false,
    );
    assert.equal(getLevelMeterModel(base).canQuieter, true);
  });
});
