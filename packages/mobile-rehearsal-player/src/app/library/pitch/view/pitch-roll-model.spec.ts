import assert from 'node:assert/strict';
import { describe, it } from 'node:test';

import {
  buildRoll,
  buildRollRows,
  DEFAULT_ROLL_ZOOM_SECONDS,
  ROLL_ZOOM_SECONDS,
  stepRollZoom,
} from './pitch-roll-model.js';
import { A3, B3, C4, sing } from './pitch-test-histories.js';

describe('roll zoom', () => {
  it('covers about 5 to 60 seconds and starts inside that range', () => {
    assert.equal(ROLL_ZOOM_SECONDS[0], 5);
    assert.equal(ROLL_ZOOM_SECONDS.at(-1), 60);
    assert.ok(ROLL_ZOOM_SECONDS.includes(DEFAULT_ROLL_ZOOM_SECONDS));
  });

  it('steps in and out and stops at both ends', () => {
    assert.equal(stepRollZoom(10, 'out'), 20);
    assert.equal(stepRollZoom(10, 'in'), 5);
    assert.equal(stepRollZoom(5, 'in'), 5);
    assert.equal(stepRollZoom(60, 'out'), 60);
  });
});

describe('roll rows', () => {
  it('centres on middle C with nothing sung, an octave tall', () => {
    const rows = buildRollRows([]);

    assert.equal(rows.length, 13);
    assert.equal(rows[0].midi, 66);
    assert.equal(rows.at(-1)?.midi, 54);
  });

  it('centres on the sung range with room around it, highest note first', () => {
    const rows = buildRollRows([A3, C4]);

    assert.equal(rows[0].midi, 65);
    assert.equal(rows.at(-1)?.midi, 53);
    assert.deepEqual(
      rows.map((row) => row.midi),
      [...rows.map((row) => row.midi)].sort((a, b) => b - a),
    );
  });

  it('grows to an octave when a single note is sung', () => {
    const rows = buildRollRows([A3]);

    assert.ok(rows.length >= 12);
    assert.ok(rows.some((row) => row.midi === A3));
  });

  it('emphasises the octave rows and names every row', () => {
    const rows = buildRollRows([A3]);
    const octave = rows.filter((row) => row.isOctave);

    assert.ok(octave.length > 0);
    assert.ok(octave.every((row) => row.name.startsWith('C')));
    assert.ok(rows.every((row) => /^[A-G]/.test(row.name)));
  });
});

describe('roll bars', () => {
  it('draws A3, B3 and C4 in order with the current note at the leading edge', () => {
    const history = sing([
      { midi: A3, cents: 0, seconds: 1 },
      { midi: B3, cents: 0, seconds: 1 },
      { midi: C4, cents: 0, seconds: 1 },
    ]);
    const { bars } = buildRoll(history.getSnapshot(), 5);

    assert.deepEqual(
      bars.map((bar) => bar.name),
      ['A3', 'B3', 'C4'],
    );
    assert.ok(bars[0].x1 <= bars[1].x0 + 0.05);
    assert.equal(bars[2].isCurrent, true);
    assert.equal(bars[2].x1, 1);
    assert.ok(bars[0].x0 < bars[1].x0 && bars[1].x0 < bars[2].x0);
  });

  it('colours each bar by how close the note was', () => {
    const history = sing([
      { midi: A3, cents: 5, seconds: 1 },
      { midi: B3, cents: 20, seconds: 1 },
      { midi: C4, cents: 40, seconds: 1 },
    ]);
    const { bars } = buildRoll(history.getSnapshot(), 10);

    assert.deepEqual(
      bars.map((bar) => bar.zone),
      ['precise', 'near', 'quarter-tone-off'],
    );
  });

  it('scrolls: a longer window squeezes the same note into less of the width', () => {
    const history = sing([{ midi: A3, cents: 0, seconds: 2 }]);
    const short = buildRoll(history.getSnapshot(), 5).bars[0];
    const long = buildRoll(history.getSnapshot(), 60).bars[0];

    assert.ok(short.x1 - short.x0 > long.x1 - long.x0);
  });

  it('drops notes that have scrolled out of the window', () => {
    const history = sing([{ midi: A3, cents: 0, seconds: 1 }]);

    sing([{ midi: C4, cents: 0, seconds: 1 }], 20_000, history);

    const { bars } = buildRoll(history.getSnapshot(), 5);

    assert.deepEqual(
      bars.map((bar) => bar.name),
      ['C4'],
    );
  });

  it('labels a bar only when it is wide enough to read', () => {
    const history = sing([
      { midi: A3, cents: 0, seconds: 0.1 },
      { midi: C4, cents: 0, seconds: 3 },
    ]);
    const { bars } = buildRoll(history.getSnapshot(), 5);

    assert.equal(bars[0].showLabel, false);
    assert.equal(bars[1].showLabel, true);
  });

  it('is empty with nothing sung', () => {
    const { bars } = buildRoll(sing([]).getSnapshot(), 10);

    assert.deepEqual(bars, []);
  });
});
