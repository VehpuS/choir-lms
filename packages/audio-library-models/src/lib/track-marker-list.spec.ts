import assert from 'node:assert/strict';
import { describe, it } from 'node:test';

import { buildMarkerList, deriveLoopMarkers } from './track-marker-list.ts';
import { nextAutomaticMarkerName } from './track-markers.ts';

const CREATED_AT = '2026-01-01T00:00:00.000Z';

const marker = (id: string, positionMs: number, createdAt = CREATED_AT) => ({
  id,
  name: id,
  positionMs,
  createdAt,
});

const loop = (
  id: string,
  sourceId: string,
  startMs: number,
  endMs: number,
) => ({
  id,
  name: id,
  sourceId,
  startMs,
  endMs,
});

describe('deriveLoopMarkers', () => {
  const sources = [
    { id: 'track' },
    { id: 'adjusted', adjustment: { sourceRef: 'track' } },
    { id: 'other' },
  ];

  it('derives start and end markers named after the loop', () => {
    assert.deepEqual(
      deriveLoopMarkers(
        'track',
        [loop('Verse', 'track', 1_000, 2_000)],
        sources,
      ),
      [
        {
          origin: 'loop-start',
          loopId: 'Verse',
          name: 'Verse start',
          positionMs: 1_000,
        },
        {
          origin: 'loop-end',
          loopId: 'Verse',
          name: 'Verse end',
          positionMs: 2_000,
        },
      ],
    );
  });

  it('includes loops of an adjusted copy of the track', () => {
    const derived = deriveLoopMarkers(
      'track',
      [loop('Copy loop', 'adjusted', 500, 900)],
      sources,
    );

    assert.equal(derived.length, 2);
  });

  it('ignores loops of other tracks and loops with a missing owner', () => {
    const derived = deriveLoopMarkers(
      'track',
      [loop('a', 'other', 0, 1), loop('b', 'gone', 0, 1)],
      sources,
    );

    assert.deepEqual(derived, []);
  });

  it('follows a loop edit and a loop deletion', () => {
    const edited = deriveLoopMarkers(
      'track',
      [loop('L', 'track', 1_500, 2_000)],
      sources,
    );
    const deleted = deriveLoopMarkers('track', [], sources);

    assert.equal(edited[0]?.positionMs, 1_500);
    assert.deepEqual(deleted, []);
  });

  it('leaves out the loop being edited', () => {
    const derived = deriveLoopMarkers(
      'track',
      [loop('editing', 'track', 0, 10), loop('other', 'track', 20, 30)],
      sources,
      { excludeLoopId: 'editing' },
    );

    assert.deepEqual(
      derived.map((entry) => entry.loopId),
      ['other', 'other'],
    );
  });
});

describe('buildMarkerList', () => {
  const derived = deriveLoopMarkers(
    'track',
    [loop('L', 'track', 1_000, 3_000)],
    [{ id: 'track' }],
  );

  it('merges explicit and derived markers in position order', () => {
    const list = buildMarkerList({
      explicit: [marker('a', 2_000), marker('b', 500)],
      derived,
      filter: 'all',
    });

    assert.deepEqual(
      list.map((entry) => entry.positionMs),
      [500, 1_000, 2_000, 3_000],
    );
  });

  it('puts explicit markers first at equal positions, then by creation time', () => {
    const list = buildMarkerList({
      explicit: [
        marker('late', 1_000, '2026-02-01T00:00:00.000Z'),
        marker('early', 1_000, CREATED_AT),
      ],
      derived,
      filter: 'all',
    });

    assert.deepEqual(
      list.slice(0, 3).map((entry) => entry.key),
      ['marker:early', 'marker:late', 'L:loop-start'],
    );
  });

  it('hides derived markers under the mine filter', () => {
    const list = buildMarkerList({
      explicit: [marker('a', 100)],
      derived,
      filter: 'mine',
    });

    assert.deepEqual(
      list.map((entry) => entry.origin),
      ['explicit'],
    );
  });

  it('limits a loop context to its range, inclusive at both ends', () => {
    const list = buildMarkerList({
      explicit: [
        marker('before', 999),
        marker('start', 1_000),
        marker('end', 2_000),
        marker('after', 2_001),
      ],
      derived: [],
      filter: 'all',
      range: { startMs: 1_000, endMs: 2_000 },
    });

    assert.deepEqual(
      list.map((entry) => entry.key),
      ['marker:start', 'marker:end'],
    );
  });

  it('flags markers beyond the known duration without removing them', () => {
    const list = buildMarkerList({
      explicit: [marker('in', 4_000), marker('out', 4_001)],
      derived: [],
      filter: 'all',
      durationMs: 4_000,
    });

    assert.deepEqual(
      list.map((entry) => entry.isPastEnd),
      [false, true],
    );
  });

  it('flags nothing when the duration is unknown', () => {
    const list = buildMarkerList({
      explicit: [marker('far', 9_999_999)],
      derived: [],
      filter: 'all',
    });

    assert.equal(list[0]?.isPastEnd, false);
  });
});

describe('automatic marker names', () => {
  it('fills the gap left by a deleted marker', () => {
    assert.equal(nextAutomaticMarkerName(['Marker 1', 'Marker 3']), 'Marker 2');
  });
});
