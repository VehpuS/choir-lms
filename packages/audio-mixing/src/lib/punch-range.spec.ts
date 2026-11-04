import assert from 'node:assert/strict';
import { describe, it } from 'node:test';

import {
  DEFAULT_PRE_ROLL_MS,
  MAX_PRE_ROLL_MS,
  createPunchDraft,
  formatPunchTime,
  getNearestMarkerName,
  getPlayFromMs,
  getPunchValidity,
  getSnapTargets,
  nudgePunchPoint,
  parsePunchTime,
  setPreRoll,
  setPunchPoint,
  snapPunchPoint,
  stepPreRoll,
  toPunchRange,
  toRecordingPunch,
  applyActiveLoop,
  applyCurrentPosition,
  type PunchDraft,
  type PunchLoop,
} from './punch-range.ts';

const MARKERS = [
  { name: 'Verse', positionMs: 10_000 },
  { name: 'Chorus', positionMs: 30_000 },
  { name: 'Bridge', positionMs: 50_000 },
];
const LOOP: PunchLoop = {
  endMs: 40_000,
  id: 'loop-1',
  name: 'Chorus loop',
  startMs: 30_000,
};
const both = (inMs: number, outMs: number): PunchDraft => ({
  ...createPunchDraft(),
  inMs,
  outMs,
});

describe('punch draft editing', () => {
  it('starts empty with a 3 second pre-roll and the playback stopping at Out', () => {
    assert.deepEqual(createPunchDraft(), {
      inMs: null,
      keepPlayingAfterOut: false,
      outMs: null,
      preRollMs: DEFAULT_PRE_ROLL_MS,
    });
  });

  it('sets a point, rounded and kept inside the track', () => {
    assert.equal(setPunchPoint(createPunchDraft(), 'in', 1234.6).inMs, 1235);
    assert.equal(setPunchPoint(createPunchDraft(), 'in', -50).inMs, 0);
    assert.equal(
      setPunchPoint(createPunchDraft(), 'out', 99_999, 60_000).outMs,
      60_000,
    );
  });

  it('nudges a point by 100 ms or 1 s, and leaves an unset point alone', () => {
    assert.equal(nudgePunchPoint(both(10_000, 20_000), 'in', 100).inMs, 10_100);
    assert.equal(
      nudgePunchPoint(both(10_000, 20_000), 'out', -1_000).outMs,
      19_000,
    );
    assert.equal(nudgePunchPoint(both(500, 20_000), 'in', -1_000).inMs, 0);
    assert.deepEqual(
      nudgePunchPoint(createPunchDraft(), 'in', 100),
      createPunchDraft(),
    );
  });

  it('keeps the pre-roll between 0 and 10 seconds, in 1 second steps', () => {
    assert.equal(
      setPreRoll(createPunchDraft(), 99_000).preRollMs,
      MAX_PRE_ROLL_MS,
    );
    assert.equal(setPreRoll(createPunchDraft(), -5).preRollMs, 0);
    assert.equal(stepPreRoll(createPunchDraft(), 1).preRollMs, 4_000);
    assert.equal(
      stepPreRoll(setPreRoll(createPunchDraft(), 0), -1).preRollMs,
      0,
    );
  });

  it('Use current position sets In to the playhead', () => {
    assert.equal(
      applyCurrentPosition(both(10_000, 20_000), 12_345).inMs,
      12_345,
    );
  });

  describe('Use active loop', () => {
    it('fills both points and keeps the loop so the take is a loop recording', () => {
      const draft = applyActiveLoop(createPunchDraft(), LOOP);

      assert.deepEqual(
        [draft.inMs, draft.outMs, draft.loop?.id],
        [30_000, 40_000, 'loop-1'],
      );
    });

    it('drops the loop as soon as a point moves off it, and keeps it when a point is set to the same value', () => {
      const looped = applyActiveLoop(createPunchDraft(), LOOP);

      assert.equal(setPunchPoint(looped, 'in', 31_000).loop, undefined);
      assert.equal(nudgePunchPoint(looped, 'out', 100).loop, undefined);
      assert.equal(setPunchPoint(looped, 'in', 30_000).loop?.id, 'loop-1');
    });
  });
});

describe('typed times', () => {
  it('formats to tenths of a second', () => {
    assert.equal(formatPunchTime(0), '0:00.0');
    assert.equal(formatPunchTime(83_456), '1:23.4');
    assert.equal(formatPunchTime(600_000), '10:00.0');
  });

  it('reads minutes and seconds, or plain seconds, with an optional fraction', () => {
    assert.equal(parsePunchTime('1:23'), 83_000);
    assert.equal(parsePunchTime('1:23.5'), 83_500);
    assert.equal(parsePunchTime('83'), 83_000);
    assert.equal(parsePunchTime(' 83.25 '), 83_250);
    assert.equal(parsePunchTime('0:05.250'), 5_250);
  });

  it('rejects anything else, including a seconds field of 60 or more after minutes', () => {
    for (const text of [
      '',
      'abc',
      '1:75',
      '-3',
      '1:2:3',
      '1.2.3',
      '1:23.4567',
    ]) {
      assert.equal(parsePunchTime(text), null, text);
    }
  });
});

describe('snapping', () => {
  const targets = getSnapTargets({ loop: LOOP, markers: MARKERS });

  it('offers every marker and the two loop ends', () => {
    assert.deepEqual(
      targets.map((target) => [target.kind, target.label]),
      [
        ['marker', 'Verse'],
        ['marker', 'Chorus'],
        ['marker', 'Bridge'],
        ['loop-start', 'Chorus loop start'],
        ['loop-end', 'Chorus loop end'],
      ],
    );
  });

  it('snaps to the nearest target within the tolerance', () => {
    const snapped = snapPunchPoint(30_180, targets, 250);

    assert.equal(snapped.ms, 30_000);
    assert.equal(
      snapped.snappedTo?.label === 'Chorus' ||
        snapped.snappedTo?.label === 'Chorus loop start',
      true,
    );
    assert.equal(
      snapPunchPoint(39_900, targets, 250).snappedTo?.kind,
      'loop-end',
    );
  });

  it('leaves a point alone when nothing is close', () => {
    assert.deepEqual(snapPunchPoint(20_000, targets, 250), { ms: 20_000 });
  });

  it('names the marker near a point, and nothing when none is within a few seconds', () => {
    assert.equal(getNearestMarkerName(31_000, MARKERS), 'Chorus');
    assert.equal(getNearestMarkerName(20_000, MARKERS), undefined);
  });
});

describe('getPunchValidity', () => {
  it('needs both points', () => {
    assert.deepEqual(getPunchValidity(createPunchDraft()), {
      reason: 'incomplete',
      valid: false,
    });
    assert.deepEqual(getPunchValidity({ ...createPunchDraft(), inMs: 1000 }), {
      reason: 'incomplete',
      valid: false,
    });
  });

  it('needs Out after In, and at least one second between them', () => {
    assert.equal(getPunchValidity(both(20_000, 20_000)).valid, false);
    assert.deepEqual(getPunchValidity(both(20_000, 10_000)), {
      reason: 'out-not-after-in',
      valid: false,
    });
    assert.deepEqual(getPunchValidity(both(20_000, 20_999)), {
      reason: 'too-short',
      valid: false,
    });
    assert.deepEqual(getPunchValidity(both(20_000, 21_000)), {
      lengthMs: 1_000,
      valid: true,
    });
  });

  it('needs Out inside the track when its length is known', () => {
    assert.deepEqual(getPunchValidity(both(10_000, 70_000), 60_000), {
      reason: 'past-end',
      valid: false,
    });
    assert.equal(getPunchValidity(both(10_000, 60_000), 60_000).valid, true);
  });
});

describe('the range that gets armed', () => {
  it('is only made from a valid draft, and carries the loop', () => {
    assert.equal(toPunchRange(createPunchDraft()), null);

    const range = toPunchRange(applyActiveLoop(createPunchDraft(), LOOP));

    assert.deepEqual(range && [range.inMs, range.outMs, range.loop?.id], [
      30_000,
      40_000,
      'loop-1',
    ]);
  });

  it('starts playback the pre-roll before In, never before the start of the track', () => {
    assert.equal(getPlayFromMs({ inMs: 30_000, preRollMs: 3_000 }), 27_000);
    assert.equal(getPlayFromMs({ inMs: 1_500, preRollMs: 3_000 }), 0);
  });

  it('stores In, Out and the pre-roll on the recording', () => {
    const range = toPunchRange({ ...both(10_000, 20_000), preRollMs: 5_000 });

    assert.deepEqual(range && toRecordingPunch(range), {
      inMs: 10_000,
      outMs: 20_000,
      preRollMs: 5_000,
    });
  });
});
