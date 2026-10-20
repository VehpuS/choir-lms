import assert from 'node:assert/strict';
import { describe, it } from 'node:test';

import {
  MAX_MARKER_NAME_LENGTH,
  MAX_TRACK_MARKERS,
  nextAutomaticMarkerName,
  parseTrackMarkers,
} from './track-markers.ts';

const CREATED_AT = '2026-01-01T00:00:00.000Z';
const LATER = '2026-01-02T00:00:00.000Z';

const rawMarker = (overrides: Record<string, unknown> = {}) => ({
  id: 'm1',
  name: 'Verse',
  positionMs: 1_000,
  createdAt: CREATED_AT,
  ...overrides,
});

describe('parseTrackMarkers', () => {
  it('returns undefined for an old record without the field', () => {
    assert.equal(parseTrackMarkers(undefined), undefined);
  });

  it('returns undefined for a value that is not a list', () => {
    assert.equal(parseTrackMarkers({ id: 'm1' }), undefined);
  });

  it('returns undefined for an empty list so the field is removed', () => {
    assert.equal(parseTrackMarkers([]), undefined);
  });

  it('keeps a valid marker unchanged', () => {
    assert.deepEqual(parseTrackMarkers([rawMarker()]), [rawMarker()]);
  });

  it('drops negative and non-finite positions', () => {
    const parsed = parseTrackMarkers([
      rawMarker({ id: 'negative', positionMs: -1 }),
      rawMarker({ id: 'nan', positionMs: Number.NaN }),
      rawMarker({ id: 'infinite', positionMs: Number.POSITIVE_INFINITY }),
      rawMarker({ id: 'text', positionMs: '1000' }),
      rawMarker({ id: 'ok', positionMs: 0 }),
    ]);

    assert.deepEqual(
      parsed?.map((marker) => marker.id),
      ['ok'],
    );
  });

  it('rounds a fractional position to a whole millisecond', () => {
    assert.equal(
      parseTrackMarkers([rawMarker({ positionMs: 1_000.6 })])?.[0]?.positionMs,
      1_001,
    );
  });

  it('drops entries without an id or timestamp and non-object entries', () => {
    const parsed = parseTrackMarkers([
      rawMarker({ id: '' }),
      rawMarker({ id: undefined }),
      rawMarker({ id: 'no-date', createdAt: undefined }),
      null,
      'marker',
      rawMarker({ id: 'ok' }),
    ]);

    assert.deepEqual(
      parsed?.map((marker) => marker.id),
      ['ok'],
    );
  });

  it('keeps the first marker when ids are duplicated', () => {
    const parsed = parseTrackMarkers([
      rawMarker({ id: 'dup', name: 'First' }),
      rawMarker({ id: 'dup', name: 'Second', positionMs: 5_000 }),
    ]);

    assert.deepEqual(
      parsed?.map((marker) => marker.name),
      ['First'],
    );
  });

  it('replaces a missing or blank name with the next free Marker N', () => {
    const parsed = parseTrackMarkers([
      rawMarker({ id: 'a', name: 'Marker 1', positionMs: 3_000 }),
      rawMarker({ id: 'b', name: undefined, positionMs: 1_000 }),
      rawMarker({ id: 'c', name: '   ', positionMs: 2_000 }),
    ]);

    assert.deepEqual(
      parsed?.map((marker) => [marker.id, marker.name]),
      [
        ['b', 'Marker 2'],
        ['c', 'Marker 3'],
        ['a', 'Marker 1'],
      ],
    );
  });

  it('trims names and truncates over-long ones', () => {
    const parsed = parseTrackMarkers([
      rawMarker({ id: 'a', name: '  Bridge  ' }),
      rawMarker({
        id: 'b',
        name: 'x'.repeat(MAX_MARKER_NAME_LENGTH + 20),
        positionMs: 2_000,
      }),
    ]);

    assert.equal(parsed?.[0]?.name, 'Bridge');
    assert.equal(parsed?.[1]?.name, 'x'.repeat(MAX_MARKER_NAME_LENGTH));
  });

  it('orders by position, then by creation time at equal positions', () => {
    const parsed = parseTrackMarkers([
      rawMarker({ id: 'late', positionMs: 2_000 }),
      rawMarker({ id: 'second', positionMs: 1_000, createdAt: LATER }),
      rawMarker({ id: 'first', positionMs: 1_000, createdAt: CREATED_AT }),
    ]);

    assert.deepEqual(
      parsed?.map((marker) => marker.id),
      ['first', 'second', 'late'],
    );
  });

  it('truncates a list over the limit, keeping the earliest positions', () => {
    const raw = Array.from({ length: MAX_TRACK_MARKERS + 5 }, (_, index) =>
      rawMarker({ id: `m${index}`, name: `M${index}`, positionMs: index }),
    );
    const parsed = parseTrackMarkers(raw);

    assert.equal(parsed?.length, MAX_TRACK_MARKERS);
    assert.equal(parsed?.at(-1)?.positionMs, MAX_TRACK_MARKERS - 1);
  });

  it('loads the valid markers when others in the list are malformed', () => {
    const parsed = parseTrackMarkers([
      rawMarker({ id: 'bad', positionMs: -5 }),
      rawMarker({ id: 'good' }),
    ]);

    assert.deepEqual(
      parsed?.map((marker) => marker.id),
      ['good'],
    );
  });
});

describe('nextAutomaticMarkerName', () => {
  it('starts at Marker 1', () => {
    assert.equal(nextAutomaticMarkerName([]), 'Marker 1');
  });

  it('fills the smallest gap', () => {
    assert.equal(nextAutomaticMarkerName(['Marker 1', 'Marker 3']), 'Marker 2');
  });

  it('ignores names that are not automatic', () => {
    assert.equal(nextAutomaticMarkerName(['Verse 2', 'Marker 1x']), 'Marker 1');
  });
});
