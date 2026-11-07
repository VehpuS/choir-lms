import assert from 'node:assert/strict';
import { describe, it } from 'node:test';

import {
  createCompositePlayableItem,
  createPlaylistEntryFromComposite,
  getCompositeBadgeLabel,
  isCompositeItem,
  resolveCompositePlayableItem,
} from './composite-playable.ts';
import type { CompositeTrack } from './composite-track.ts';

const composite: Pick<CompositeTrack, 'id' | 'name' | 'createdAt' | 'stems'> = {
  id: 'c1',
  name: 'Ubi caritas',
  createdAt: '2026-11-07T00:00:00.000Z',
  stems: [
    { id: 's1', trackId: 't1', name: 'Soprano', offsetMs: 0, mine: false },
    { id: 's2', trackId: 't2', name: 'Bass', offsetMs: 500, mine: true },
  ],
};
const track = (id: string, durationMs?: number, available = true) => ({
  id,
  durationMs,
  availability: {
    status: available ? ('available' as const) : ('unavailable' as const),
  },
});

describe('composite playable item', () => {
  it('is a composite kind whose synthetic source is the composite', () => {
    const item = createCompositePlayableItem(composite, {
      durationMs: 200_500,
    });

    assert.equal(item.kind, 'composite');
    assert.equal(item.id, 'composite:c1');
    assert.equal(item.sourceId, 'c1');
    assert.equal(item.source.id, 'c1');
    assert.equal(item.source.driveFileId, '');
    assert.equal(item.source.durationMs, 200_500);
    assert.deepEqual(item.range, { startMs: 0, endMs: 200_500 });
    assert.equal(item.description, 'Composite · 2 stems');
    assert.equal(isCompositeItem(item), true);
  });

  it('has an open range while the duration is unknown', () => {
    const item = createCompositePlayableItem(composite);

    assert.equal(item.source.durationMs, undefined);
    assert.equal(item.range.endMs, null);
  });

  it('takes its length from the stems counting offsets', () => {
    const item = resolveCompositePlayableItem(composite, {
      sources: [track('t1', 200_000), track('t2', 200_000)],
    });

    assert.equal(item?.source.durationMs, 200_500);
  });

  it('plays with the stems that are left and ignores a missing one for the length', () => {
    const item = resolveCompositePlayableItem(composite, {
      sources: [track('t1', 180_000)],
    });

    assert.equal(item?.source.durationMs, 180_000);
  });

  it('is unavailable when every stem is missing or cannot be played', () => {
    assert.equal(
      resolveCompositePlayableItem(composite, { sources: [] }),
      null,
    );
    assert.equal(
      resolveCompositePlayableItem(composite, {
        sources: [track('t1', 1000, false), track('t2', 1000, false)],
      }),
      null,
    );
  });

  it('carries playlist ids', () => {
    const item = resolveCompositePlayableItem(
      composite,
      { sources: [track('t1', 1000), track('t2', 1000)] },
      { playlistId: 'p1', playlistEntryId: 'e1' },
    );

    assert.equal(item?.playlistId, 'p1');
    assert.equal(item?.playlistEntryId, 'e1');
  });
});

describe('composite playlist entry', () => {
  it('references the composite id as a composite entry', () => {
    const entry = createPlaylistEntryFromComposite(composite, 'now', {
      playlistId: 'p1',
      sortIndex: 3,
    });

    assert.equal(entry.kind, 'composite');
    assert.equal(entry.sourceId, 'c1');
    assert.equal(entry.playlistId, 'p1');
    assert.equal(entry.sortIndex, 3);
    assert.equal(entry.title, 'Ubi caritas');
  });

  it('labels one stem in the singular', () => {
    assert.equal(getCompositeBadgeLabel(1), 'Composite · 1 stem');
  });
});
