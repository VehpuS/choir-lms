import assert from 'node:assert/strict';
import { describe, it } from 'node:test';

import {
  buildBars,
  buildKeyChanges,
  buildMeterMap,
  meterBarLength,
  readTimeSignature,
  uniformBars,
} from './midi-notation-bars.ts';

const PPQ = 480;
const BAR_44 = 1920; // ticks

describe('readTimeSignature', () => {
  it('reads a usable time signature and falls back to 4/4 otherwise', () => {
    assert.deepEqual(readTimeSignature([3, 4]), [3, 4]);
    assert.deepEqual(readTimeSignature([6, 8]), [6, 8]);
    assert.deepEqual(readTimeSignature(undefined), [4, 4]);
    // 7/64 is not a whole number of 16ths.
    assert.deepEqual(readTimeSignature([7, 64]), [4, 4]);
    assert.deepEqual(readTimeSignature([0, 4]), [4, 4]);
  });
});

describe('buildMeterMap', () => {
  it('starts with the first time signature and adds each real change', () => {
    const meters = buildMeterMap(
      [
        { ticks: 0, timeSignature: [4, 4] },
        { ticks: 2 * BAR_44, timeSignature: [3, 4] },
        { ticks: 2 * BAR_44 + 3 * PPQ, timeSignature: [4, 4] },
      ],
      PPQ,
    );

    assert.deepEqual(meters, [
      { beatType: 4, beats: 4, startUnit: 0 },
      { beatType: 4, beats: 3, startUnit: 96 },
      { beatType: 4, beats: 4, startUnit: 132 },
    ]);
  });

  it('drops a repeat of the meter in force and uses 4/4 when there are no events', () => {
    assert.deepEqual(
      buildMeterMap(
        [
          { ticks: 0, timeSignature: [3, 4] },
          { ticks: BAR_44, timeSignature: [3, 4] },
        ],
        PPQ,
      ),
      [{ beatType: 4, beats: 3, startUnit: 0 }],
    );
    assert.deepEqual(buildMeterMap([], PPQ), [
      { beatType: 4, beats: 4, startUnit: 0 },
    ]);
  });

  it('applies the first signature from the start even when its event comes later', () => {
    assert.deepEqual(
      buildMeterMap([{ ticks: 960, timeSignature: [3, 4] }], PPQ),
      [{ beatType: 4, beats: 3, startUnit: 0 }],
    );
  });

  it('shifts later changes by the pickup offset', () => {
    const meters = buildMeterMap(
      [
        { ticks: 0, timeSignature: [4, 4] },
        { ticks: BAR_44, timeSignature: [3, 4] },
      ],
      PPQ,
      36,
    );

    assert.equal(meters[1]?.startUnit, 48 + 36);
  });
});

describe('buildKeyChanges', () => {
  it('keeps the first event at a tick, the first key from the start, and real changes', () => {
    assert.deepEqual(
      buildKeyChanges(
        [
          { fifths: 3, ticks: 0 },
          { fifths: 0, ticks: 0 },
          { fifths: 3, ticks: BAR_44 },
          { fifths: 5, ticks: 2 * BAR_44 },
          { fifths: undefined, ticks: 3 * BAR_44 },
        ],
        PPQ,
      ),
      [
        { fifths: 3, startUnit: 0 },
        { fifths: 5, startUnit: 96 },
      ],
    );
  });

  it('gives nothing for a file without keys', () => {
    assert.deepEqual(buildKeyChanges([], PPQ), []);
  });
});

describe('buildBars', () => {
  const meters = buildMeterMap(
    [
      { ticks: 0, timeSignature: [4, 4] },
      { ticks: 2 * BAR_44, timeSignature: [3, 4] },
    ],
    PPQ,
  );

  it('lays bars of the meter in force end to end, with the key of each', () => {
    const bars = buildBars({
      defaultFifths: 0,
      endUnit: 48 * 2 + 36 * 2,
      keys: [
        { fifths: 1, startUnit: 0 },
        { fifths: 2, startUnit: 96 },
      ],
      maxBars: 500,
      meters,
    });

    assert.deepEqual(
      bars.map(({ beats, end, fifths, start }) => [beats, start, end, fifths]),
      [
        [4, 0, 48, 1],
        [4, 48, 96, 1],
        [3, 96, 132, 2],
        [3, 132, 168, 2],
      ],
    );
  });

  it('cuts a bar short where a time signature change falls inside it', () => {
    const bars = buildBars({
      defaultFifths: 0,
      endUnit: 100,
      keys: [],
      maxBars: 500,
      meters: buildMeterMap(
        [
          { ticks: 0, timeSignature: [4, 4] },
          { ticks: BAR_44 + 2 * PPQ, timeSignature: [3, 4] },
        ],
        PPQ,
      ),
    });

    assert.deepEqual(
      bars.map(({ end, start }) => [start, end]),
      [
        [0, 48],
        [48, 72],
        [72, 108],
      ],
    );
  });

  it('applies a key change that falls mid-bar from the next bar', () => {
    const bars = buildBars({
      defaultFifths: 0,
      endUnit: 96,
      keys: [{ fifths: 4, startUnit: 60 }],
      maxBars: 500,
      meters: [{ beatType: 4, beats: 4, startUnit: 0 }],
    });

    assert.deepEqual(
      bars.map(({ fifths }) => fifths),
      [0, 0],
    );
    assert.equal(
      buildBars({
        defaultFifths: 0,
        endUnit: 144,
        keys: [{ fifths: 4, startUnit: 60 }],
        maxBars: 500,
        meters: [{ beatType: 4, beats: 4, startUnit: 0 }],
      })[2]?.fifths,
      4,
    );
  });

  it('uses the default key when the file has none and stops after the bar limit', () => {
    const bars = buildBars({
      defaultFifths: -2,
      endUnit: 1_000_000,
      keys: [],
      maxBars: 10,
      meters: [{ beatType: 4, beats: 4, startUnit: 0 }],
    });

    assert.equal(bars[0]?.fifths, -2);
    assert.equal(bars.length, 11);
  });
});

describe('uniformBars and meterBarLength', () => {
  it('lays equal bars of a time signature', () => {
    assert.deepEqual(uniformBars({ barCount: 2, beats: 3 }), [
      { beatType: 4, beats: 3, end: 36, fifths: 0, start: 0 },
      { beatType: 4, beats: 3, end: 72, fifths: 0, start: 36 },
    ]);
    assert.equal(meterBarLength({ beatType: 8, beats: 6 }), 36);
  });
});
