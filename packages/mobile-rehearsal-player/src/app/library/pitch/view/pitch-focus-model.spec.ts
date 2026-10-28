import assert from 'node:assert/strict';
import { describe, it } from 'node:test';

import type { PitchReading } from '@org/pitch-detection';

import {
  buildFocusReadout,
  buildFocusTrace,
  FOCUS_BANDS,
  resolveTarget,
  ZONE_LABELS,
} from './pitch-focus-model.js';
import { A3, B3, reading, sing } from './pitch-test-histories.js';

const IDLE: PitchReading = { active: false };

describe('focus target', () => {
  it('is the nearest note of what is sung by default', () => {
    const target = resolveTarget(null, reading(B3, 12));

    assert.deepEqual(target, { midi: B3, name: 'B3', isHeld: false });
  });

  it('has no target before anything is sung', () => {
    assert.deepEqual(resolveTarget(null, IDLE), {
      midi: null,
      name: null,
      isHeld: false,
    });
  });

  it('is the held note whatever is sung', () => {
    const target = resolveTarget(A3, reading(B3, 0));

    assert.deepEqual(target, { midi: A3, name: 'A3', isHeld: true });
  });

  it('keeps a held note while nothing is sung', () => {
    assert.equal(resolveTarget(A3, IDLE).midi, A3);
  });
});

describe('focus bands', () => {
  it('draws the three bands at 10, 25 and 50 cents with their names', () => {
    assert.deepEqual(
      FOCUS_BANDS.map((band) => [band.label, band.limitCents]),
      [
        ['Precise', 10],
        ['Near', 25],
        ['Quarter tone off', 50],
      ],
    );
  });
});

describe('focus readout', () => {
  it('says Precise about 8 cents sharp and Quarter tone off about 40', () => {
    const target = resolveTarget(null, reading(A3, 8));

    assert.equal(
      buildFocusReadout(target, reading(A3, 8)).zoneLabel,
      'Precise',
    );
    assert.equal(
      buildFocusReadout(target, reading(A3, 40)).zoneLabel,
      'Quarter tone off',
    );
  });

  it('measures a held target, past 50 cents, as Off pitch', () => {
    const readout = buildFocusReadout(resolveTarget(A3, IDLE), reading(B3, 0));

    assert.equal(readout.cents, 200);
    assert.equal(readout.zone, 'off-pitch');
    assert.equal(readout.zoneLabel, ZONE_LABELS['off-pitch']);
  });

  it('is empty while nothing is sung or the note is only held', () => {
    const target = resolveTarget(A3, IDLE);
    const held: PitchReading = {
      ...reading(A3, 0),
      held: true,
    } as PitchReading;

    assert.equal(buildFocusReadout(target, IDLE).zoneLabel, null);
    assert.equal(buildFocusReadout(target, held).zoneLabel, null);
  });
});

describe('focus trace', () => {
  it('measures each sample from the note it sits on with no held note', () => {
    const history = sing([
      { midi: A3, cents: 8, seconds: 0.1 },
      { midi: B3, cents: -30, seconds: 0.1 },
    ]);
    const points = buildFocusTrace(history.getSnapshot(), 5, null);

    assert.equal(points[0].cents, 8);
    assert.equal(points[0].zone, 'precise');
    assert.equal(points.at(-1)?.cents, -30);
    assert.equal(points.at(-1)?.zone, 'quarter-tone-off');
    assert.ok(points.every((point) => point.clamped === null));
  });

  it('clamps a held target past 50 cents to the edge with a direction marker', () => {
    const history = sing([{ midi: B3, cents: 0, seconds: 0.1 }]);
    const above = buildFocusTrace(history.getSnapshot(), 5, A3);
    const below = buildFocusTrace(
      sing([{ midi: A3, cents: 0, seconds: 0.1 }]).getSnapshot(),
      5,
      B3,
    );

    assert.ok(
      above.every((point) => point.cents === 50 && point.clamped === 'up'),
    );
    assert.ok(
      below.every((point) => point.cents === -50 && point.clamped === 'down'),
    );
    assert.ok(above.every((point) => point.zone === 'off-pitch'));
  });

  it('does not clamp within the panel, even on a held target', () => {
    const history = sing([{ midi: A3, cents: 30, seconds: 0.1 }]);
    const [first] = buildFocusTrace(history.getSnapshot(), 5, A3);

    assert.equal(first.cents, 30);
    assert.equal(first.clamped, null);
  });

  it('places points across the window and marks where a run starts', () => {
    const history = sing([{ midi: A3, cents: 0, seconds: 1 }]);

    // Silence between phrases arrives as an idle frame, which ends the run.
    history.push(2000, IDLE);
    sing([{ midi: A3, cents: 0, seconds: 1 }], 3000, history);

    const points = buildFocusTrace(history.getSnapshot(), 5, null);

    assert.equal(points.filter((point) => point.startsRun).length, 2);
    assert.ok(points.every((point) => point.x >= 0 && point.x <= 1));
    assert.ok((points.at(-1)?.x ?? 0) > 0.95);
  });
});
