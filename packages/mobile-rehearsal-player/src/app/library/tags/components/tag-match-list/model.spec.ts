import assert from 'node:assert/strict';
import { describe, it } from 'node:test';

import { createDriveAudioSource } from '@org/audio-library-models';
import type { RehearsalLibraryTagMatch } from '@org/audio-library-runtime';

import {
  filterTagMatchesByQuery,
  filterTagMatchesByType,
  getTagMatchIconName,
  getTagMatchKey,
  getTagMatchMetadataLabel,
  getTagMatchTitle,
  getTagMatchTypeLabel,
  sortTagMatches,
  type TagMatchListSortState,
} from './model';

const TRACK_MATCH: RehearsalLibraryTagMatch = {
  kind: 'track',
  item: createDriveAudioSource({
    driveFileId: 'drive:zebra',
    name: 'Zebra Track',
    mimeType: 'audio/mpeg',
    availability: { status: 'available' },
    durationMs: 125_000,
    createdAt: '2026-01-03T00:00:00.000Z',
  }),
};

const LOOP_MATCH: RehearsalLibraryTagMatch = {
  kind: 'loop',
  item: {
    id: 'loop:alto',
    name: 'Alto Loop',
    sourceId: 'source:alto',
    sourceName: 'Alto Track',
    startMs: 0,
    endMs: 10_000,
    ownerId: 'owner:1',
    createdAt: '2026-01-02T00:00:00.000Z',
    updatedAt: '2026-01-02T00:00:00.000Z',
  },
};

const PLAYLIST_MATCH: RehearsalLibraryTagMatch = {
  kind: 'playlist',
  item: {
    id: 'playlist:rehearsal',
    name: 'Amber Playlist',
    items: [
      {
        id: 'entry:1',
        playlistId: 'playlist:rehearsal',
        sortIndex: 0,
        kind: 'track',
        sourceId: 'source:1',
        title: 'Track 1',
        createdAt: '2026-01-01T00:00:00.000Z',
      },
    ],
    ownerId: 'owner:1',
    createdAt: '2026-01-04T00:00:00.000Z',
    updatedAt: '2026-01-04T00:00:00.000Z',
  },
};

const FOLDER_MATCH: RehearsalLibraryTagMatch = {
  kind: 'folder',
  item: {
    id: 'folder:altos',
    name: 'Altos',
    parentFolderId: null,
    createdAt: '2026-01-01T00:00:00.000Z',
  },
};

describe('tag match list model', () => {
  it('derives title, type label, icon, and key per entity kind', () => {
    assert.equal(getTagMatchTitle(TRACK_MATCH), 'Zebra Track');
    assert.equal(getTagMatchTypeLabel(LOOP_MATCH), 'Loop');
    assert.equal(getTagMatchIconName(PLAYLIST_MATCH), 'playlist-music-outline');
    assert.equal(getTagMatchIconName(FOLDER_MATCH), 'folder-outline');
    assert.equal(getTagMatchKey(TRACK_MATCH), `track:${TRACK_MATCH.item.id}`);
  });

  it('formats type-specific metadata labels', () => {
    assert.equal(getTagMatchMetadataLabel(TRACK_MATCH), '2:05');
    assert.equal(getTagMatchMetadataLabel(LOOP_MATCH), '0:10');
    assert.equal(getTagMatchMetadataLabel(PLAYLIST_MATCH), '1 item');
    assert.equal(getTagMatchMetadataLabel(FOLDER_MATCH), 'Folder');
  });

  describe('sortTagMatches', () => {
    const matches = [PLAYLIST_MATCH, TRACK_MATCH, LOOP_MATCH, FOLDER_MATCH];

    it('sorts by name ascending and descending', () => {
      const ascending: TagMatchListSortState = { field: 'name', direction: 'asc' };
      const descending: TagMatchListSortState = { field: 'name', direction: 'desc' };

      assert.deepEqual(
        sortTagMatches(matches, ascending).map(getTagMatchTitle),
        ['Alto Loop', 'Altos', 'Amber Playlist', 'Zebra Track'],
      );
      assert.deepEqual(
        sortTagMatches(matches, descending).map(getTagMatchTitle),
        ['Zebra Track', 'Amber Playlist', 'Altos', 'Alto Loop'],
      );
    });

    it('sorts by type in track/loop/playlist/folder order, tie-breaking on name', () => {
      const ascending: TagMatchListSortState = { field: 'type', direction: 'asc' };

      assert.deepEqual(
        sortTagMatches(matches, ascending).map((match) => match.kind),
        ['track', 'loop', 'playlist', 'folder'],
      );

      const descending: TagMatchListSortState = { field: 'type', direction: 'desc' };

      assert.deepEqual(
        sortTagMatches(matches, descending).map((match) => match.kind),
        ['folder', 'playlist', 'loop', 'track'],
      );
    });

    it('sorts by date added ascending and descending', () => {
      const ascending: TagMatchListSortState = { field: 'date', direction: 'asc' };
      const descending: TagMatchListSortState = { field: 'date', direction: 'desc' };

      assert.deepEqual(
        sortTagMatches(matches, ascending).map(getTagMatchTitle),
        ['Altos', 'Alto Loop', 'Zebra Track', 'Amber Playlist'],
      );
      assert.deepEqual(
        sortTagMatches(matches, descending).map(getTagMatchTitle),
        ['Amber Playlist', 'Zebra Track', 'Alto Loop', 'Altos'],
      );
    });

    it('does not mutate the input array', () => {
      const originalOrder = [...matches];

      sortTagMatches(matches, { field: 'name', direction: 'asc' });

      assert.deepEqual(matches, originalOrder);
    });
  });

  describe('filterTagMatchesByType', () => {
    const matches = [PLAYLIST_MATCH, TRACK_MATCH, LOOP_MATCH, FOLDER_MATCH];

    it('returns every match when no type is selected', () => {
      assert.deepEqual(filterTagMatchesByType(matches, []), matches);
    });

    it('keeps only matches of the selected types', () => {
      assert.deepEqual(filterTagMatchesByType(matches, ['track', 'folder']), [
        TRACK_MATCH,
        FOLDER_MATCH,
      ]);
    });

    it('returns an empty array when no match has a selected type', () => {
      const trackOnlyMatches = [TRACK_MATCH];

      assert.deepEqual(filterTagMatchesByType(trackOnlyMatches, ['folder']), []);
    });
  });

  describe('filterTagMatchesByQuery', () => {
    const matches = [PLAYLIST_MATCH, TRACK_MATCH, LOOP_MATCH, FOLDER_MATCH];

    it('returns every match for an empty or whitespace-only query', () => {
      assert.deepEqual(filterTagMatchesByQuery(matches, ''), matches);
      assert.deepEqual(filterTagMatchesByQuery(matches, '   '), matches);
    });

    it('matches by name case-insensitively', () => {
      assert.deepEqual(filterTagMatchesByQuery(matches, 'ZEBRA'), [
        TRACK_MATCH,
      ]);
    });

    it('trims the query before matching', () => {
      assert.deepEqual(filterTagMatchesByQuery(matches, '  alto  '), [
        LOOP_MATCH,
        FOLDER_MATCH,
      ]);
    });

    it('returns an empty array when nothing matches', () => {
      assert.deepEqual(filterTagMatchesByQuery(matches, 'nonexistent'), []);
    });
  });
});
