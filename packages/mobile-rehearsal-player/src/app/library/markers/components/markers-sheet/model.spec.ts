import assert from 'node:assert/strict';
import { describe, it } from 'node:test';

import type { DerivedLoopMarker, TrackMarker } from '@org/audio-library-models';

import {
  MARKERS_EMPTY_MESSAGE,
  MARKERS_PAST_END_MESSAGE,
  buildMarkersSheetModel,
  type MarkersSheetInput,
} from './model';

const marker = (id: string, positionMs: number, name = id): TrackMarker => ({
  id,
  name,
  positionMs,
  createdAt: `2026-10-01T00:00:0${id.length}.000Z`,
});

const derivedStart = (positionMs: number): DerivedLoopMarker => ({
  origin: 'loop-start',
  loopId: 'loop-1',
  name: 'Verse 2 start',
  positionMs,
});

const buildInput = (
  overrides: Partial<MarkersSheetInput> = {},
): MarkersSheetInput => ({
  explicit: [],
  derived: [],
  filter: 'all',
  ownerName: 'Ave Maria',
  isOwnerLoaded: true,
  canMutateLibrary: true,
  ...overrides,
});

describe('buildMarkersSheetModel', () => {
  it('titles the list after the owning track', () => {
    const model = buildMarkersSheetModel(buildInput());

    assert.equal(model.subtitle, 'Markers for Ave Maria');
  });

  it('shows the empty state and offers adding only when the track is loaded', () => {
    const loaded = buildMarkersSheetModel(buildInput());
    const unloaded = buildMarkersSheetModel(
      buildInput({ isOwnerLoaded: false }),
    );

    assert.equal(loaded.isEmpty, true);
    assert.equal(loaded.emptyMessage, MARKERS_EMPTY_MESSAGE);
    assert.equal(loaded.canAddMarker, true);
    assert.equal(unloaded.canAddMarker, false);
  });

  it('offers adding in a loop list only while the playhead is inside the loop', () => {
    const range = { startMs: 10_000, endMs: 20_000 };
    const offered = (currentPositionMs: number) =>
      buildMarkersSheetModel(buildInput({ currentPositionMs, range }))
        .canAddMarker;

    assert.equal(offered(10_000), true);
    assert.equal(offered(20_000), true);
    assert.equal(offered(9_999), false);
    assert.equal(offered(20_001), false);
  });

  it('does not offer adding in a read-only library', () => {
    const model = buildMarkersSheetModel(
      buildInput({ canMutateLibrary: false }),
    );

    assert.equal(model.canAddMarker, false);
    assert.equal(model.canCreateLoops, false);
  });

  it('lists explicit and loop markers in position order with times', () => {
    const model = buildMarkersSheetModel(
      buildInput({
        explicit: [marker('b', 72_400), marker('a', 12_000)],
        derived: [derivedStart(60_000)],
      }),
    );

    assert.deepEqual(
      model.rows.map((row) => [row.name, row.timeLabel]),
      [
        ['a', '0:12.0'],
        ['Verse 2 start', '1:00.0'],
        ['b', '1:12.4'],
      ],
    );
  });

  it('hides loop markers under the My markers filter', () => {
    const model = buildMarkersSheetModel(
      buildInput({
        explicit: [marker('a', 1_000)],
        derived: [derivedStart(60_000)],
        filter: 'mine',
      }),
    );

    assert.deepEqual(
      model.rows.map((row) => row.origin),
      ['explicit'],
    );
  });

  it('lists only markers inside a loop range, inclusive', () => {
    const model = buildMarkersSheetModel(
      buildInput({
        explicit: [
          marker('a', 30_000),
          marker('b', 70_000),
          marker('c', 120_000),
          marker('d', 60_000),
          marker('e', 90_000),
        ],
        range: { startMs: 60_000, endMs: 90_000 },
      }),
    );

    assert.deepEqual(
      model.rows.map((row) => row.name),
      ['d', 'b', 'e'],
    );
  });

  it('offers rename, move, and delete only for explicit rows', () => {
    const model = buildMarkersSheetModel(
      buildInput({
        explicit: [marker('a', 1_000)],
        derived: [derivedStart(60_000)],
      }),
    );
    const [explicitRow, derivedRow] = model.rows;

    assert.deepEqual(explicitRow?.actions, [
      'loop-to-next',
      'rename',
      'move',
      'delete',
    ]);
    assert.deepEqual(derivedRow?.actions, ['open-loop', 'keep-as-marker']);
    assert.equal(explicitRow?.markerId, 'a');
    assert.equal(derivedRow?.loopId, 'loop-1');
  });

  it('keeps Open loop but drops writes in a read-only library', () => {
    const model = buildMarkersSheetModel(
      buildInput({
        explicit: [marker('a', 1_000)],
        derived: [derivedStart(60_000)],
        canMutateLibrary: false,
      }),
    );

    assert.deepEqual(model.rows[0]?.actions, ['loop-to-next']);
    assert.deepEqual(model.rows[1]?.actions, ['open-loop']);
  });

  it('flags markers past the end as not jumpable with the explanation', () => {
    const model = buildMarkersSheetModel(
      buildInput({
        explicit: [marker('a', 10_000), marker('late', 200_000)],
        durationMs: 120_000,
      }),
    );
    const late = model.rows[1];

    assert.equal(late?.isPastEnd, true);
    assert.equal(late?.canJump, false);
    assert.equal(late?.pastEndMessage, MARKERS_PAST_END_MESSAGE);
    // Still editable: it can be moved back or deleted.
    assert.ok(late?.actions.includes('move'));
    assert.ok(late?.actions.includes('delete'));
    assert.equal(model.rows[0]?.pastEndMessage, undefined);
  });

  it('prefills Loop to next marker from the next listed marker', () => {
    const model = buildMarkersSheetModel(
      buildInput({
        explicit: [marker('Chorus', 30_000), marker('Bridge', 90_000)],
        durationMs: 180_000,
      }),
    );

    assert.deepEqual(model.rows[0]?.loopToNext, {
      name: 'Chorus',
      startMs: 30_000,
      endMs: 90_000,
    });
    // The last marker runs to the known track end.
    assert.deepEqual(model.rows[1]?.loopToNext, {
      name: 'Bridge',
      startMs: 90_000,
      endMs: 180_000,
    });
  });

  it('omits Loop to next marker for the last row when the length is unknown', () => {
    const model = buildMarkersSheetModel(
      buildInput({ explicit: [marker('a', 1_000), marker('b', 5_000)] }),
    );

    assert.ok(model.rows[0]?.loopToNext);
    assert.equal(model.rows[1]?.loopToNext, undefined);
    assert.equal(model.rows[1]?.actions.includes('loop-to-next'), false);
  });

  it('omits Loop to next marker when the next marker shares the position', () => {
    const model = buildMarkersSheetModel(
      buildInput({
        explicit: [
          marker('a', 5_000),
          marker('bb', 5_000),
          marker('ccc', 9_000),
        ],
      }),
    );

    assert.equal(model.rows[0]?.loopToNext, undefined);
    assert.ok(model.rows[1]?.loopToNext);
  });

  it('offers Create loops from markers only with explicit markers', () => {
    const onlyDerived = buildMarkersSheetModel(
      buildInput({ derived: [derivedStart(60_000)] }),
    );
    const withExplicit = buildMarkersSheetModel(
      buildInput({ explicit: [marker('a', 1_000)] }),
    );

    assert.equal(onlyDerived.canCreateLoops, false);
    assert.equal(withExplicit.canCreateLoops, true);
  });

  it('hides every loop-making entry when loops cannot be made from here', () => {
    const model = buildMarkersSheetModel(
      buildInput({
        explicit: [marker('a', 1_000), marker('b', 2_000)],
        durationMs: 10_000,
        canMakeLoops: false,
      }),
    );

    assert.equal(model.canCreateLoops, false);
    assert.equal(model.canSelect, false);
    assert.equal(
      model.rows.some((row) => row.actions.includes('loop-to-next')),
      false,
    );
  });

  it('lists rows without any actions for a picker', () => {
    const model = buildMarkersSheetModel(
      buildInput({
        explicit: [marker('a', 1_000)],
        derived: [derivedStart(60_000)],
        showRowActions: false,
      }),
    );

    assert.deepEqual(
      model.rows.map((row) => row.actions),
      [[], []],
    );
  });

  it('lists usable markers first and out-of-reach ones under a heading', () => {
    const model = buildMarkersSheetModel(
      buildInput({
        explicit: [
          marker('early', 5_000),
          marker('mid', 50_000),
          marker('late', 90_000),
        ],
        isPickable: (positionMs) => positionMs > 20_000,
        outOfReachLabel: 'Before the loop start',
        showRowActions: false,
      }),
    );

    assert.deepEqual(
      model.rows.map((row) => [row.name, row.isOutOfReach]),
      [
        ['mid', false],
        ['late', false],
        ['early', true],
      ],
    );
    assert.equal(model.outOfReachLabel, 'Before the loop start');
  });

  it('shows no heading when every marker is usable', () => {
    const model = buildMarkersSheetModel(
      buildInput({
        explicit: [marker('a', 50_000)],
        isPickable: () => true,
        outOfReachLabel: 'Before the loop start',
      }),
    );

    assert.equal(model.outOfReachLabel, undefined);
    assert.equal(model.rows[0]?.isOutOfReach, false);
  });

  it('offers Select only with two jumpable rows', () => {
    const one = buildMarkersSheetModel(
      buildInput({ explicit: [marker('a', 1_000)] }),
    );
    const two = buildMarkersSheetModel(
      buildInput({ explicit: [marker('a', 1_000), marker('b', 2_000)] }),
    );

    assert.equal(one.canSelect, false);
    assert.equal(two.canSelect, true);
  });
});
