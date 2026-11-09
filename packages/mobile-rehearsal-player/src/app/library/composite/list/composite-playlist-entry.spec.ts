import assert from 'node:assert/strict';
import { describe, it } from 'node:test';

import type { CompositeTrack } from '@org/audio-library-models';

import {
  COMPOSITE_DELETED_LABEL,
  getCompositeEntryLabel,
  isCompositeEntryPlayable,
} from './composite-playlist-entry';

const stem = (id: string) => ({
  id,
  trackId: `t-${id}`,
  name: id,
  offsetMs: 0,
  mine: false,
});
const composite = {
  id: 'c1',
  name: 'Ubi',
  createdAt: '2026-11-09T00:00:00.000Z',
  stems: [stem('s'), stem('a')],
} as unknown as CompositeTrack;
const track = (id: string, available = true) => ({
  id,
  durationMs: 168_000,
  availability: available
    ? ({ status: 'available' } as const)
    : ({ status: 'unavailable', reason: 'missing' } as const),
});
const entry = { sourceId: 'c1' };

describe('getCompositeEntryLabel', () => {
  it('shows the badge and length with the playlist separator', () => {
    assert.equal(
      getCompositeEntryLabel({
        entry,
        composites: [composite],
        library: { sources: [track('t-s'), track('t-a')] },
      }),
      'Composite • 2 stems • 2:48',
    );
  });

  it('says a deleted composite is deleted', () => {
    assert.equal(
      getCompositeEntryLabel({
        entry,
        composites: [],
        library: { sources: [] },
      }),
      COMPOSITE_DELETED_LABEL,
    );
  });

  it('says every stem is missing when none can play', () => {
    assert.equal(
      getCompositeEntryLabel({
        entry,
        composites: [composite],
        library: { sources: [] },
      }),
      'Composite • 2 stems • Every stem is missing',
    );
  });
});

describe('isCompositeEntryPlayable', () => {
  it('plays while the composite exists and one stem can sound', () => {
    const library = { sources: [track('t-s'), track('t-a', false)] };

    assert.equal(
      isCompositeEntryPlayable({ entry, composites: [composite], library }),
      true,
    );
  });

  it('does not play a deleted composite or one with every stem gone', () => {
    assert.equal(
      isCompositeEntryPlayable({
        entry,
        composites: [],
        library: { sources: [track('t-s')] },
      }),
      false,
    );
    assert.equal(
      isCompositeEntryPlayable({
        entry,
        composites: [composite],
        library: { sources: [] },
      }),
      false,
    );
  });
});
