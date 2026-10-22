import assert from 'node:assert/strict';
import { describe, it } from 'node:test';

import type { TrackMarker } from '@org/audio-library-models';

import {
  INITIAL_MARKER_SELECTION,
  buildMarkersSheetModel,
  cancelMarkerSelection,
  resolveMarkerPairLoop,
  startMarkerSelection,
  toggleMarkerSelection,
  type MarkersSheetInput,
} from './model';

const marker = (id: string, positionMs: number, name = id): TrackMarker => ({
  id,
  name,
  positionMs,
  createdAt: `2026-10-01T00:00:0${id.length}.000Z`,
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

describe('marker selection', () => {
  const rows = buildMarkersSheetModel(
    buildInput({
      explicit: [
        marker('a', 10_000),
        marker('bb', 50_000),
        marker('ccc', 80_000),
      ],
      durationMs: 100_000,
    }),
  ).rows;

  it('starts empty and cancels back to the initial state', () => {
    const selecting = startMarkerSelection();

    assert.equal(selecting.isSelecting, true);
    assert.deepEqual(selecting.selectedKeys, []);
    assert.deepEqual(cancelMarkerSelection(), INITIAL_MARKER_SELECTION);
  });

  it('ignores toggles outside select mode', () => {
    const next = toggleMarkerSelection(INITIAL_MARKER_SELECTION, 'marker:a');

    assert.equal(next, INITIAL_MARKER_SELECTION);
  });

  it('toggles a row off again and refuses a third pick', () => {
    let selection = startMarkerSelection();

    selection = toggleMarkerSelection(selection, 'marker:a');
    selection = toggleMarkerSelection(selection, 'marker:bb');
    selection = toggleMarkerSelection(selection, 'marker:ccc');
    assert.deepEqual(selection.selectedKeys, ['marker:a', 'marker:bb']);

    selection = toggleMarkerSelection(selection, 'marker:a');
    assert.deepEqual(selection.selectedKeys, ['marker:bb']);
  });

  it('makes a loop from exactly two rows, earlier first, named after the start', () => {
    // Picked in reverse order on purpose: list order decides the start.
    const selection = {
      isSelecting: true,
      selectedKeys: ['marker:ccc', 'marker:a'],
    };

    assert.deepEqual(resolveMarkerPairLoop(rows, selection, 100_000), {
      name: 'a',
      startMs: 10_000,
      endMs: 80_000,
    });
  });

  it('offers no loop for fewer or more than two rows', () => {
    const one = { isSelecting: true, selectedKeys: ['marker:a'] };
    const none = startMarkerSelection();

    assert.equal(resolveMarkerPairLoop(rows, one), undefined);
    assert.equal(resolveMarkerPairLoop(rows, none), undefined);
  });

  it('offers no loop when both rows share a position', () => {
    const sameSpot = buildMarkersSheetModel(
      buildInput({ explicit: [marker('a', 5_000), marker('bb', 5_000)] }),
    ).rows;
    const selection = {
      isSelecting: true,
      selectedKeys: ['marker:a', 'marker:bb'],
    };

    assert.equal(resolveMarkerPairLoop(sameSpot, selection), undefined);
  });

  it('offers no loop when a chosen marker is past the end', () => {
    const withLate = buildMarkersSheetModel(
      buildInput({
        explicit: [marker('a', 5_000), marker('late', 200_000)],
        durationMs: 100_000,
      }),
    ).rows;
    const selection = {
      isSelecting: true,
      selectedKeys: ['marker:a', 'marker:late'],
    };

    assert.equal(
      resolveMarkerPairLoop(withLate, selection, 100_000),
      undefined,
    );
  });
});
