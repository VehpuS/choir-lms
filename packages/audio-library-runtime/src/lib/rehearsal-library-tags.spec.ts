import assert from 'node:assert/strict';
import { describe, it } from 'node:test';

import {
  createDriveAudioSource,
  type NamedLoop,
  type Playlist,
  type RehearsalLibraryFolderNode,
} from '@org/audio-library-models';

import { aggregateRehearsalLibraryTags } from './rehearsal-library-tags.ts';

const SOPRANO_SOURCE = createDriveAudioSource({
  driveFileId: 'drive:soprano',
  name: 'Soprano Track',
  mimeType: 'audio/mpeg',
  availability: { status: 'available' },
  tags: [' Soprano ', 'Warmup'],
});

const ALTO_LOOP: NamedLoop = {
  id: 'loop:alto',
  name: 'Alto Loop',
  sourceId: 'source:alto',
  sourceName: 'Alto Track',
  startMs: 0,
  endMs: 10_000,
  ownerId: 'owner:1',
  createdAt: '2026-01-01T00:00:00.000Z',
  updatedAt: '2026-01-01T00:00:00.000Z',
  tags: ['alto', 'warmup'],
};

const PLAYLIST: Playlist = {
  id: 'playlist:rehearsal',
  name: 'Rehearsal Playlist',
  items: [],
  ownerId: 'owner:1',
  createdAt: '2026-01-01T00:00:00.000Z',
  updatedAt: '2026-01-01T00:00:00.000Z',
  tags: ['Soprano', 'Rehearsal'],
};

const FOLDER: RehearsalLibraryFolderNode = {
  id: 'folder:altos',
  name: 'Altos',
  parentFolderId: null,
  tags: ['Alto'],
  createdAt: '2026-01-01T00:00:00.000Z',
};

describe('aggregateRehearsalLibraryTags', () => {
  it('dedupes tags case-insensitively across entity types and counts distinct entities per tag', () => {
    const result = aggregateRehearsalLibraryTags({
      entityCollections: {
        sources: [SOPRANO_SOURCE],
        loops: [ALTO_LOOP],
        playlists: [PLAYLIST],
      },
      folders: [FOLDER],
    });

    assert.deepEqual(result, [
      { tag: 'alto', count: 2 },
      { tag: 'Soprano', count: 2 },
      { tag: 'Warmup', count: 2 },
      { tag: 'Rehearsal', count: 1 },
    ]);
  });

  it('returns an empty list when no saved entity carries a tag', () => {
    const result = aggregateRehearsalLibraryTags({
      entityCollections: { sources: [], loops: [], playlists: [] },
      folders: [],
    });

    assert.deepEqual(result, []);
  });
});
