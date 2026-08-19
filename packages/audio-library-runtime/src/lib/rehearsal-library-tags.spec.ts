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
  tagAddedAt: {
    Soprano: '2026-01-05T00:00:00.000Z',
    Warmup: '2026-01-06T00:00:00.000Z',
  },
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
  tagAddedAt: {
    alto: '2026-01-02T00:00:00.000Z',
    warmup: '2026-01-03T00:00:00.000Z',
  },
};

const PLAYLIST: Playlist = {
  id: 'playlist:rehearsal',
  name: 'Rehearsal Playlist',
  items: [],
  ownerId: 'owner:1',
  createdAt: '2026-01-01T00:00:00.000Z',
  updatedAt: '2026-01-01T00:00:00.000Z',
  tags: ['Soprano', 'Rehearsal'],
  tagAddedAt: {
    Soprano: '2026-01-04T00:00:00.000Z',
    Rehearsal: '2026-01-07T00:00:00.000Z',
  },
};

const FOLDER: RehearsalLibraryFolderNode = {
  id: 'folder:altos',
  name: 'Altos',
  parentFolderId: null,
  tags: ['Alto'],
  tagAddedAt: { Alto: '2026-01-01T00:00:00.000Z' },
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
      { tag: 'alto', count: 2, createdAt: '2026-01-01T00:00:00.000Z' },
      { tag: 'Soprano', count: 2, createdAt: '2026-01-04T00:00:00.000Z' },
      { tag: 'Warmup', count: 2, createdAt: '2026-01-03T00:00:00.000Z' },
      { tag: 'Rehearsal', count: 1, createdAt: '2026-01-07T00:00:00.000Z' },
    ]);
  });

  it('returns an empty list when no saved entity carries a tag', () => {
    const result = aggregateRehearsalLibraryTags({
      entityCollections: { sources: [], loops: [], playlists: [] },
      folders: [],
    });

    assert.deepEqual(result, []);
  });

  it("computes createdAt as the earliest tagAddedAt across every entity carrying the tag, not the first-seen entity's date", () => {
    const olderSource = createDriveAudioSource({
      driveFileId: 'drive:older',
      name: 'Older Track',
      mimeType: 'audio/mpeg',
      availability: { status: 'available' },
      tags: ['Warmup'],
      tagAddedAt: { Warmup: '2020-01-01T00:00:00.000Z' },
    });
    const newerSource = createDriveAudioSource({
      driveFileId: 'drive:newer',
      name: 'Newer Track',
      mimeType: 'audio/mpeg',
      availability: { status: 'available' },
      tags: ['Warmup'],
      tagAddedAt: { Warmup: '2026-01-01T00:00:00.000Z' },
    });

    const result = aggregateRehearsalLibraryTags({
      entityCollections: {
        sources: [newerSource, olderSource],
        loops: [],
        playlists: [],
      },
      folders: [],
    });

    assert.deepEqual(result, [
      { tag: 'Warmup', count: 2, createdAt: '2020-01-01T00:00:00.000Z' },
    ]);
  });

  it('falls back to a valid current timestamp when a tag has no recorded tagAddedAt entry', () => {
    const sourceMissingTagAddedAt = createDriveAudioSource({
      driveFileId: 'drive:legacy',
      name: 'Legacy Track',
      mimeType: 'audio/mpeg',
      availability: { status: 'available' },
      tags: ['Legacy'],
    });

    const result = aggregateRehearsalLibraryTags({
      entityCollections: {
        sources: [sourceMissingTagAddedAt],
        loops: [],
        playlists: [],
      },
      folders: [],
    });

    assert.equal(result.length, 1);
    assert.equal(
      Number.isNaN(Date.parse(result[0]?.createdAt ?? '')),
      false,
    );
  });
});
