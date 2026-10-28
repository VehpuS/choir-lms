import assert from 'node:assert/strict';
import { describe, it } from 'node:test';

import { buildFocusTrace } from './pitch-focus-model.js';
import {
  FOCUS_PANEL_RANGE_CENTS,
  layoutFocus,
  layoutRoll,
} from './pitch-view-geometry.js';
import { buildRoll } from './pitch-roll-model.js';
import { A3, B3, C4, sing } from './pitch-test-histories.js';

const ROLL_SIZE = { width: 600, height: 260 };
const FOCUS_SIZE = { width: 360, height: 150 };

describe('roll layout', () => {
  it('stacks every row to fill the height, highest note first', () => {
    const roll = buildRoll(
      sing([{ midi: A3, cents: 0, seconds: 1 }]).getSnapshot(),
      10,
    );
    const { rows } = layoutRoll(roll, ROLL_SIZE, null);
    const total = rows.reduce((sum, row) => sum + row.height, 0);

    assert.ok(Math.abs(total - ROLL_SIZE.height) < 1e-6);
    assert.equal(rows[0].y, 0);
    assert.ok(
      rows.every((row, index) => index === 0 || row.y > rows[index - 1].y),
    );
  });

  it('marks black keys and octave rows', () => {
    const roll = buildRoll(
      sing([{ midi: C4, cents: 0, seconds: 1 }]).getSnapshot(),
      10,
    );
    const { rows } = layoutRoll(roll, ROLL_SIZE, null);
    const cSharp = rows.find((row) => row.midi === 61);
    const middleC = rows.find((row) => row.midi === 60);

    assert.equal(cSharp?.isBlackKey, true);
    assert.equal(middleC?.isBlackKey, false);
    assert.equal(middleC?.isOctave, true);
  });

  it('puts a bar in its note row, with the current one at the leading edge', () => {
    const history = sing([
      { midi: A3, cents: 5, seconds: 1 },
      { midi: B3, cents: 0, seconds: 2 },
    ]);
    const layout = layoutRoll(
      buildRoll(history.getSnapshot(), 5),
      ROLL_SIZE,
      null,
    );
    const [first, second] = layout.bars;
    const rowFor = (midi: number) =>
      layout.rows.find((row) => row.midi === midi);

    assert.equal(first.y, (rowFor(A3)?.y ?? 0) + 1);
    assert.equal(second.y, (rowFor(B3)?.y ?? 0) + 1);
    assert.ok(first.x < second.x);
    assert.ok(Math.abs(second.x + second.width - ROLL_SIZE.width) < 1);
    assert.equal(second.isCurrent, true);
    assert.equal(first.zone, 'precise');
  });

  it('names a bar only where it is wide enough', () => {
    const history = sing([
      { midi: A3, cents: 0, seconds: 0.1 },
      { midi: C4, cents: 0, seconds: 3 },
    ]);
    const { bars } = layoutRoll(
      buildRoll(history.getSnapshot(), 5),
      ROLL_SIZE,
      null,
    );

    assert.equal(bars[0].label, null);
    assert.equal(bars[1].label, 'C4');
  });

  it('highlights the target row only while it is on the scale', () => {
    const roll = buildRoll(
      sing([{ midi: A3, cents: 0, seconds: 1 }]).getSnapshot(),
      10,
    );
    const shown = layoutRoll(roll, ROLL_SIZE, A3);
    const far = layoutRoll(roll, ROLL_SIZE, A3 + 40);

    assert.ok(shown.targetRow);
    assert.equal(far.targetRow, null);
    assert.equal(layoutRoll(roll, ROLL_SIZE, null).targetRow, null);
  });

  it('draws five faint time lines across the window', () => {
    const roll = buildRoll(sing([]).getSnapshot(), 10);

    assert.equal(layoutRoll(roll, ROLL_SIZE, null).gridX.length, 5);
  });
});

describe('focus layout', () => {
  const trace = (cents: number, heldMidi: number | null = null) => {
    const history = sing([{ midi: A3, cents, seconds: 0.2 }]);

    return buildFocusTrace(history.getSnapshot(), 5, heldMidi);
  };

  it('stacks the bands inside one another, centred on the target line', () => {
    const { bands, centreY } = layoutFocus([], FOCUS_SIZE, 70);

    assert.deepEqual(
      bands.map((band) => band.label),
      ['Precise', 'Near', 'Quarter tone off'],
    );
    assert.ok(
      bands[0].height < bands[1].height && bands[1].height < bands[2].height,
    );
    assert.ok(Math.abs(centreY - FOCUS_SIZE.height / 2) < 1e-6);
    assert.ok(Math.abs(bands[0].y + bands[0].height / 2 - centreY) < 1e-6);
  });

  it('puts sharp above the line and flat below it', () => {
    const sharp = layoutFocus(trace(30), FOCUS_SIZE, 70);
    const flat = layoutFocus(trace(-30), FOCUS_SIZE, 70);

    assert.ok((sharp.current?.y ?? 0) < sharp.centreY);
    assert.ok((flat.current?.y ?? 0) > flat.centreY);
  });

  it('keeps a point on a held target past 50 cents at the edge with a marker', () => {
    const { current, marker } = layoutFocus(trace(0, A3 - 2), FOCUS_SIZE, 70);

    assert.equal(marker, 'up');
    assert.ok(current);
    assert.ok(current.y > 0);
    assert.equal(current.zone, 'off-pitch');
  });

  it('shows no marker within the panel', () => {
    assert.equal(layoutFocus(trace(20), FOCUS_SIZE, 70).marker, null);
  });

  it('breaks the line where a run starts, and keeps the dot on the leading edge', () => {
    const history = sing([{ midi: A3, cents: 0, seconds: 0.2 }]);

    // Silence between phrases arrives as an idle frame, which ends the run.
    history.push(1000, { active: false });
    sing([{ midi: A3, cents: 0, seconds: 0.2 }], 2000, history);

    const layout = layoutFocus(
      buildFocusTrace(history.getSnapshot(), 5, null),
      FOCUS_SIZE,
      70,
    );

    assert.equal(layout.runs.length, 2);
    assert.ok((layout.current?.x ?? 0) <= FOCUS_SIZE.width - 70 + 1e-6);
    assert.ok((layout.current?.x ?? 0) > (FOCUS_SIZE.width - 70) * 0.95);
  });

  it('is empty with nothing sung', () => {
    const layout = layoutFocus([], FOCUS_SIZE, 70);

    assert.deepEqual(layout.runs, []);
    assert.equal(layout.current, null);
    assert.equal(layout.marker, null);
    assert.ok(FOCUS_PANEL_RANGE_CENTS > 50);
  });
});
