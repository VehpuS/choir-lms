import assert from 'node:assert/strict';
import { describe, it } from 'node:test';

import { deriveLoopMarkers } from './track-marker-list.ts';
import { resolveMarkerOwner } from './track-markers.ts';
import { createLoopPlayableItem } from './rehearsal-domain.ts';
import {
  createCompositeOwnerSources,
  createCompositePlayableItem,
  isCompositeSource,
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

describe('a composite as an owner', () => {
  const library = { sources: [track('t1', 100_000), track('t2', 100_000)] };
  const withMarkers = {
    ...composite,
    markers: [
      { id: 'm1', name: 'Verse', positionMs: 30_000, createdAt: 'now' },
    ],
  } as unknown as typeof composite;

  it('is its own marker owner through its synthetic source', () => {
    const sources = createCompositeOwnerSources([composite], library);
    const owner = resolveMarkerOwner({ id: 'c1', sourceId: 'c1' }, sources);

    assert.equal(owner?.id, 'c1');
    assert.equal(isCompositeSource(sources[0]), true);
  });

  it('carries the composite markers on its source and none from the stems', () => {
    const [source] = createCompositeOwnerSources([withMarkers], library);

    assert.equal(source.markers?.length, 1);
    assert.equal(
      createCompositeOwnerSources([composite], library)[0].markers,
      undefined,
    );
  });

  it('owns the loops made on it, in composite time', () => {
    const [source] = createCompositeOwnerSources([composite], library);
    const loop = {
      id: 'l1',
      name: 'Bar 5',
      sourceId: 'c1',
      sourceName: 'Ubi caritas',
      startMs: 65_000,
      endMs: 95_000,
      createdAt: 'now',
    };
    const derived = deriveLoopMarkers('c1', [loop], [source]);
    const item = createLoopPlayableItem(loop as never, source);

    assert.deepEqual(
      derived.map((marker) => marker.positionMs),
      [65_000, 95_000],
    );
    assert.equal(item.kind, 'loop');
    assert.equal(isCompositeSource(item.source), true);
    assert.deepEqual(item.range, { startMs: 65_000, endMs: 95_000 });
  });

  it('marks a composite with no stems left as unavailable', () => {
    const [source] = createCompositeOwnerSources([composite], { sources: [] });

    assert.equal(source.availability.status, 'unavailable');
  });

  it('does not treat a Drive source as a composite', () => {
    assert.equal(isCompositeSource({ mimeType: 'audio/mpeg' }), false);
  });
});
