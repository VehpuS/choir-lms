import assert from 'node:assert/strict';
import { describe, it } from 'node:test';

import { createPunchDraft, setPunchPoint } from '@org/audio-mixing';

import {
  PUNCH_SNAP_PX,
  applyFlagTap,
  applyHandleDrag,
  applyTypedTime,
  getPunchSheetModel,
} from './punch-sheet-model';

const DURATION_MS = 200_000;
const MARKERS = [
  { name: 'Verse', positionMs: 30_000 },
  { name: 'Chorus', positionMs: 110_000 },
  { name: 'Bridge', positionMs: 125_000 },
];

const draftBetween = (inMs: number, outMs: number) =>
  setPunchPoint(
    setPunchPoint(createPunchDraft(), 'in', inMs, DURATION_MS),
    'out',
    outMs,
    DURATION_MS,
  );

describe('getPunchSheetModel', () => {
  it('cannot arm until both points are set, and says so', () => {
    const model = getPunchSheetModel({
      draft: createPunchDraft(),
      markers: MARKERS,
      trackDurationMs: DURATION_MS,
    });

    assert.equal(model.canArm, false);
    assert.equal(model.note.isProblem, true);
    assert.equal(model.inView.ratio, undefined);
  });

  it('summarises a valid range by marker names and what play will do', () => {
    const model = getPunchSheetModel({
      draft: draftBetween(110_000, 125_000),
      markers: MARKERS,
      trackDurationMs: DURATION_MS,
    });

    assert.equal(model.canArm, true);
    assert.equal(model.note.isProblem, false);
    assert.match(model.note.text, /Records 15 s · Chorus → Bridge\./);
    assert.match(model.note.text, /starts 3 s before 1:50\.0/);
    assert.equal(model.inView.near, 'near Chorus');
    assert.equal(model.inView.ratio, 0.55);
  });

  it('falls back to times when the points are not near a marker', () => {
    const model = getPunchSheetModel({
      draft: draftBetween(60_000, 80_000),
      markers: MARKERS,
      trackDurationMs: DURATION_MS,
    });

    assert.match(model.note.text, /1:00\.0 → 1:20\.0/);
    assert.equal(model.inView.near, undefined);
  });

  it('explains an out point that is not after the in point', () => {
    const model = getPunchSheetModel({
      draft: draftBetween(110_000, 100_000),
      markers: MARKERS,
      trackDurationMs: DURATION_MS,
    });

    assert.equal(model.canArm, false);
    assert.equal(model.note.text, 'Out must be after In.');
  });
});

describe('applyFlagTap', () => {
  it('sets In on the first tap and Out on the second, then alternates', () => {
    const first = applyFlagTap(createPunchDraft(), 110_000, 'in');
    const second = applyFlagTap(first.draft, 125_000, first.next);
    const third = applyFlagTap(second.draft, 30_000, second.next);

    assert.deepEqual(
      [first.draft.inMs, second.draft.outMs, third.draft.inMs],
      [110_000, 125_000, 30_000],
    );
    assert.deepEqual(
      [first.next, second.next, third.next],
      ['out', 'in', 'out'],
    );
  });
});

describe('applyHandleDrag', () => {
  const drag = (ratio: number) =>
    applyHandleDrag({
      draft: createPunchDraft(),
      markers: MARKERS,
      point: 'in',
      ratio,
      trackDurationMs: DURATION_MS,
      widthPx: 400,
    });

  it('snaps to a marker within a few points', () => {
    const nearChorus = (110_000 + 500) / DURATION_MS;

    assert.equal(drag(nearChorus).inMs, 110_000);
  });

  it('leaves the point where it is dropped when no marker is close', () => {
    const toleranceMs = (PUNCH_SNAP_PX / 400) * DURATION_MS;
    const away = (110_000 + toleranceMs * 3) / DURATION_MS;

    assert.equal(drag(away).inMs, Math.round(away * DURATION_MS));
  });

  it('stays inside the track', () => {
    assert.equal(drag(2).inMs, DURATION_MS);
    assert.equal(drag(-1).inMs, 0);
  });

  it('does nothing before the waveform has been measured', () => {
    const draft = createPunchDraft();

    assert.equal(
      applyHandleDrag({
        draft,
        markers: MARKERS,
        point: 'in',
        ratio: 0.5,
        trackDurationMs: DURATION_MS,
        widthPx: 0,
      }),
      draft,
    );
  });
});

describe('applyTypedTime', () => {
  it('takes a typed time and ignores text that is not one', () => {
    const typed = applyTypedTime(
      createPunchDraft(),
      'in',
      '1:05.5',
      DURATION_MS,
    );

    assert.equal(typed.inMs, 65_500);
    assert.equal(applyTypedTime(typed, 'in', 'soon', DURATION_MS), typed);
  });
});
