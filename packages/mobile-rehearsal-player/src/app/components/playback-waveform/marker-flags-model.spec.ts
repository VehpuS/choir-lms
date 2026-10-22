import assert from 'node:assert/strict';
import { describe, it } from 'node:test';

import {
  MARKER_FLAG_HIT_RADIUS,
  MARKER_FLAG_MERGE_DISTANCE,
  resolveNearestWaveformFlag,
  resolveWaveformFlags,
  resolveWaveformMarkerX,
  resolveWaveformPositionMs,
  type WaveformMarker,
} from './marker-flags-model';

const WIDTH = 300;
const RANGE = { startMs: 0, endMs: 300_000 };
// 1000 ms is exactly 1 pt on this waveform.

const marker = (
  key: string,
  positionMs: number,
  kind: WaveformMarker['kind'] = 'explicit',
): WaveformMarker => ({
  key,
  name: key,
  positionMs,
  kind,
  timeLabel: `${positionMs / 1000}s`,
});

const flagsFor = (markers: WaveformMarker[], range = RANGE, width = WIDTH) =>
  resolveWaveformFlags({ markers, ...range, width });

describe('resolveWaveformFlags', () => {
  it('places a flag at its share of the range', () => {
    const [flag] = flagsFor([marker('a', 75_000)]);

    assert.equal(flag?.x, 75);
    assert.equal(flag?.kind, 'explicit');
    assert.equal(flag?.accessibilityLabel, 'a, 75s');
  });

  it('measures from the start of a loop range, not from zero', () => {
    const [flag] = flagsFor([marker('a', 130_000)], {
      startMs: 100_000,
      endMs: 160_000,
    });

    assert.equal(flag?.x, 150);
  });

  it('orders flags left to right regardless of input order', () => {
    const flags = flagsFor([marker('b', 200_000), marker('a', 50_000)]);

    assert.deepEqual(
      flags.map(({ key }) => key),
      ['a', 'b'],
    );
  });

  it('leaves out markers outside the range and keeps the inclusive edges', () => {
    const flags = flagsFor(
      [
        marker('before', 99_000),
        marker('start', 100_000),
        marker('end', 160_000),
        marker('after', 161_000),
      ],
      { startMs: 100_000, endMs: 160_000 },
    );

    assert.deepEqual(
      flags.map(({ key }) => key),
      ['start', 'end'],
    );
  });

  it('draws nothing before the waveform has a width or the range a length', () => {
    assert.deepEqual(flagsFor([marker('a', 1000)], RANGE, 0), []);
    assert.deepEqual(
      flagsFor([marker('a', 1000)], { startMs: 5, endMs: 5 }),
      [],
    );
  });

  it('merges flags closer than the merge distance into the earliest', () => {
    const flags = flagsFor([
      marker('first', 100_000),
      marker('second', 103_000),
      marker('far', 200_000),
    ]);

    assert.equal(flags.length, 2);
    assert.equal(flags[0]?.key, 'first');
    assert.equal(flags[0]?.x, 100);
    assert.deepEqual(flags[0]?.memberKeys, ['first', 'second']);
    assert.equal(flags[0]?.accessibilityLabel, 'first, 100s, and 1 more');
  });

  it('keeps flags exactly at the merge distance apart', () => {
    const flags = flagsFor([
      marker('a', 100_000),
      marker('b', 100_000 + MARKER_FLAG_MERGE_DISTANCE * 1000),
    ]);

    assert.equal(flags.length, 2);
  });

  it('merges a crowd measured from its earliest flag', () => {
    const flags = flagsFor([
      marker('a', 100_000),
      marker('b', 108_000),
      marker('c', 116_000),
    ]);

    // c is 16 pt from a, so it starts a flag of its own.
    assert.deepEqual(
      flags.map(({ memberKeys }) => memberKeys),
      [['a', 'b'], ['c']],
    );
  });

  it("draws a merged flag as the user's own when any member is", () => {
    const [flag] = flagsFor([
      marker('loop', 100_000, 'derived'),
      marker('mine', 101_000, 'explicit'),
    ]);

    assert.equal(flag?.kind, 'explicit');
  });

  it('keeps loop-only flags dim', () => {
    const [flag] = flagsFor([marker('loop', 100_000, 'derived')]);

    assert.equal(flag?.kind, 'derived');
  });

  it('respects the filter because it only draws the markers it is given', () => {
    const all = [marker('mine', 50_000), marker('loop', 80_000, 'derived')];
    const mineOnly = all.filter(({ kind }) => kind === 'explicit');

    assert.equal(flagsFor(all).length, 2);
    assert.deepEqual(
      flagsFor(mineOnly).map(({ key }) => key),
      ['mine'],
    );
  });
});

describe('resolveNearestWaveformFlag', () => {
  const flags = flagsFor([marker('a', 100_000), marker('b', 150_000)]);

  it('finds the flag under a press within reach', () => {
    assert.equal(resolveNearestWaveformFlag(flags, 105)?.key, 'a');
    assert.equal(resolveNearestWaveformFlag(flags, 140)?.key, 'b');
  });

  it('picks the nearer of two flags in reach', () => {
    const close = flagsFor([marker('a', 100_000), marker('b', 130_000)]);

    assert.equal(resolveNearestWaveformFlag(close, 118)?.key, 'b');
  });

  it('returns nothing on empty waveform', () => {
    assert.equal(
      resolveNearestWaveformFlag(flags, 100 + MARKER_FLAG_HIT_RADIUS + 1),
      null,
    );
    assert.equal(resolveNearestWaveformFlag([], 10), null);
  });
});

describe('position helpers', () => {
  it('maps a position to a point and a point back to a position', () => {
    assert.equal(resolveWaveformMarkerX(75_000, 0, 300_000, 300), 75);
    assert.equal(resolveWaveformPositionMs(75, 0, 300_000, 300), 75_000);
  });

  it('maps within a loop range and clamps to its ends', () => {
    assert.equal(
      resolveWaveformPositionMs(150, 100_000, 160_000, 300),
      130_000,
    );
    assert.equal(
      resolveWaveformPositionMs(-20, 100_000, 160_000, 300),
      100_000,
    );
    assert.equal(
      resolveWaveformPositionMs(400, 100_000, 160_000, 300),
      160_000,
    );
  });

  it('falls back to the range start without a width', () => {
    assert.equal(resolveWaveformPositionMs(10, 5_000, 9_000, 0), 5_000);
  });
});
