import assert from 'node:assert/strict';
import { describe, it } from 'node:test';

import type { Playlist, PlaylistEntry } from '@org/audio-library-models';

import {
  buildPlaylistRow,
  buildTrackRow,
  countLoopsBySourceId,
  sumPlaylistDurationMs,
} from './library-files-model/row-builders';
import {
  AVAILABLE_SOURCE,
  PLAYLIST,
  SAVED_LOOP,
  UNAVAILABLE_SOURCE,
} from './library-files-model-test-fixtures';

const TRACK_FILE_LINK = {
  entityId: AVAILABLE_SOURCE.id,
  entityKind: 'track' as const,
  id: `file-link:track:${AVAILABLE_SOURCE.id}`,
  parentFolderId: 'folder:library-root',
};

const PLAYLIST_FILE_LINK = {
  entityId: PLAYLIST.id,
  entityKind: 'playlist' as const,
  id: `file-link:playlist:${PLAYLIST.id}`,
  parentFolderId: 'folder:library-root',
};

const createEntry = (
  overrides: Pick<PlaylistEntry, 'id' | 'kind' | 'sourceId'> &
    Partial<PlaylistEntry>,
): PlaylistEntry => {
  return {
    createdAt: PLAYLIST.createdAt,
    playlistId: PLAYLIST.id,
    sortIndex: 0,
    title: overrides.id,
    ...overrides,
  };
};

const PLAYLIST_WITH_TRACK_AND_LOOP: Playlist = {
  ...PLAYLIST,
  items: [
    createEntry({
      id: 'entry-track',
      kind: 'track',
      sourceId: AVAILABLE_SOURCE.id,
    }),
    createEntry({
      id: 'entry-loop',
      kind: 'loop',
      loopId: SAVED_LOOP.id,
      sourceId: AVAILABLE_SOURCE.id,
    }),
  ],
};

describe('Files row meta lines', () => {
  it('reads a track as duration, tags, then loop count', () => {
    const row = buildTrackRow({
      entityNameByKey: new Map(),
      fileLink: TRACK_FILE_LINK,
      loopCount: 3,
      source: { ...AVAILABLE_SOURCE, tags: ['Alto', 'Latin'] },
    });

    assert.equal(row.supportingLabel, '4:05 · Alto · Latin · 3 loops');
  });

  it('falls back to the kind word when a track has nothing else to show', () => {
    const row = buildTrackRow({
      entityNameByKey: new Map(),
      fileLink: TRACK_FILE_LINK,
      source: { ...AVAILABLE_SOURCE, durationMs: undefined },
    });

    assert.equal(row.supportingLabel, 'Track');
  });

  it('keeps unavailable tracks on their availability label', () => {
    const row = buildTrackRow({
      entityNameByKey: new Map(),
      fileLink: { ...TRACK_FILE_LINK, entityId: UNAVAILABLE_SOURCE.id },
      loopCount: 2,
      source: UNAVAILABLE_SOURCE,
    });

    assert.equal(row.supportingLabel, 'Track unavailable');
  });

  it('reads a playlist as kind, item count, and total running time', () => {
    const row = buildPlaylistRow({
      entityNameByKey: new Map(),
      fileLink: PLAYLIST_FILE_LINK,
      playlist: PLAYLIST_WITH_TRACK_AND_LOOP,
      totalDurationMs: 257000,
    });

    assert.equal(row.supportingLabel, 'Playlist · 2 items · 4:17');
  });

  it('leaves the total off an empty playlist or one with an unknown duration', () => {
    const emptyRow = buildPlaylistRow({
      entityNameByKey: new Map(),
      fileLink: PLAYLIST_FILE_LINK,
      playlist: PLAYLIST,
      totalDurationMs: 0,
    });
    const unknownRow = buildPlaylistRow({
      entityNameByKey: new Map(),
      fileLink: PLAYLIST_FILE_LINK,
      playlist: PLAYLIST_WITH_TRACK_AND_LOOP,
    });

    assert.equal(emptyRow.supportingLabel, 'Playlist · 0 items');
    assert.equal(unknownRow.supportingLabel, 'Playlist · 2 items');
  });
});

describe('sumPlaylistDurationMs', () => {
  it('adds track durations and loop lengths', () => {
    assert.equal(
      sumPlaylistDurationMs({
        loopsById: new Map([[SAVED_LOOP.id, SAVED_LOOP]]),
        playlist: PLAYLIST_WITH_TRACK_AND_LOOP,
        sourcesById: new Map([[AVAILABLE_SOURCE.id, AVAILABLE_SOURCE]]),
      }),
      245000 + 12000,
    );
  });

  it('is unknown when any item has no known duration', () => {
    assert.equal(
      sumPlaylistDurationMs({
        loopsById: new Map(),
        playlist: PLAYLIST_WITH_TRACK_AND_LOOP,
        sourcesById: new Map([[AVAILABLE_SOURCE.id, AVAILABLE_SOURCE]]),
      }),
      undefined,
    );
  });
});

describe('countLoopsBySourceId', () => {
  it('counts saved loops per parent track', () => {
    const counts = countLoopsBySourceId([
      SAVED_LOOP,
      { ...SAVED_LOOP, id: 'loop-2' },
      { ...SAVED_LOOP, id: 'loop-3', sourceId: 'drive:other' },
    ]);

    assert.equal(counts.get(AVAILABLE_SOURCE.id), 2);
    assert.equal(counts.get('drive:other'), 1);
  });
});
