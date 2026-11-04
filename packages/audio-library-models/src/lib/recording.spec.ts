import assert from 'node:assert/strict';
import { describe, it } from 'node:test';

import {
  clampNudgeMs,
  DEFAULT_RECORDING_LEVEL_DB,
  clampRecordingBalance,
  clampRecordingLevelDb,
  dbToLinear,
  getRecordingLevelDb,
  linearToDb,
  formatRecordingDuration,
  formatRecordingSize,
  getRecordingOwner,
  nextRecordingName,
} from './recording.ts';
import { DEFAULT_PLAYBACK_SHAPING } from './playback-shaping.ts';
import { buildRecording } from './recording-test-fixtures.ts';

describe('nextRecordingName', () => {
  it('starts at Recording 1 and fills the smallest gap', () => {
    assert.equal(nextRecordingName([]), 'Recording 1');
    assert.equal(
      nextRecordingName(['Recording 1', 'Recording 3', 'Solo take']),
      'Recording 2',
    );
  });
});

describe('getRecordingOwner', () => {
  const track = { id: 'track-1', driveFileId: 'd', name: 'Song' };
  const adjusted = {
    id: 'adj-1',
    name: 'Slow',
    transform: { ...DEFAULT_PLAYBACK_SHAPING, speedMultiplier: 0.7 },
  };
  const loop = { id: 'loop-1', name: 'Verse', startMs: 0, endMs: 5000 };

  it('prefers the loop, then the adjusted track, then the track', () => {
    const owner = (lineage: Parameters<typeof buildRecording>[0]) =>
      getRecordingOwner(buildRecording(lineage));

    assert.deepEqual(owner({ lineage: { track, adjusted, loop } }), {
      kind: 'loop',
      id: 'loop-1',
    });
    assert.deepEqual(owner({ lineage: { track, adjusted } }), {
      kind: 'adjusted',
      id: 'adj-1',
    });
    assert.deepEqual(owner({ lineage: { track } }), {
      kind: 'track',
      id: 'track-1',
    });
  });
});

describe('formatting and clamps', () => {
  it('formats durations as m:ss', () => {
    assert.equal(formatRecordingDuration(0), '0:00');
    assert.equal(formatRecordingDuration(65_900), '1:05');
  });

  it('formats sizes in KB below a megabyte and MB above', () => {
    assert.equal(formatRecordingSize(312 * 1024), '312 KB');
    assert.equal(formatRecordingSize(5 * 1024 * 1024), '5.0 MB');
  });

  it('clamps the nudge to ±250 ms and ignores non-finite input', () => {
    assert.equal(clampNudgeMs(400), 250);
    assert.equal(clampNudgeMs(-400), -250);
    assert.equal(clampNudgeMs(12.4), 12);
    assert.equal(clampNudgeMs(Number.NaN), 0);
  });

  it('clamps balance to 0..100 with 50 as the fallback', () => {
    assert.equal(clampRecordingBalance(140), 100);
    assert.equal(clampRecordingBalance(Number.NaN), 50);
  });
});

describe('recording level', () => {
  it('clamps to -12..+18 dB in tenths, with 0 as the fallback', () => {
    assert.equal(clampRecordingLevelDb(40), 18);
    assert.equal(clampRecordingLevelDb(-40), -12);
    assert.equal(clampRecordingLevelDb(3.14159), 3.1);
    assert.equal(clampRecordingLevelDb(Number.NaN), DEFAULT_RECORDING_LEVEL_DB);
    assert.equal(clampRecordingLevelDb(Number.POSITIVE_INFINITY), 0);
  });

  it('reads a recording with no level as 0 dB, and a stored one clamped', () => {
    assert.equal(getRecordingLevelDb(buildRecording()), 0);
    assert.equal(getRecordingLevelDb({ levelDb: 6 }), 6);
    assert.equal(getRecordingLevelDb({ levelDb: 99 }), 18);
  });

  it('converts decibels to a gain factor and back', () => {
    assert.equal(dbToLinear(0), 1);
    assert.ok(Math.abs(dbToLinear(6) - 1.9953) < 1e-3);
    assert.ok(Math.abs(dbToLinear(-6) - 0.5012) < 1e-3);
    assert.ok(Math.abs(linearToDb(dbToLinear(12.5)) - 12.5) < 1e-9);
    assert.equal(linearToDb(0), Number.NEGATIVE_INFINITY);
  });
});
