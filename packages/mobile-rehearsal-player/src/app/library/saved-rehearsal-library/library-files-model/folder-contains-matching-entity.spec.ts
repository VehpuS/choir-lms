import assert from 'node:assert/strict';
import { describe, it } from 'node:test';

import {
  createDriveAudioSource,
  type NamedLoop,
  type RehearsalLibraryFileTree,
} from '@org/audio-library-models';

import { folderContainsMatchingEntity } from './folder-contains-matching-entity';

const ROOT_FOLDER = {
  id: 'folder:library-root',
  name: 'Library',
  parentFolderId: null,
  createdAt: '2026-05-10T10:00:00.000Z',
};

const TAGGED_SOURCE = createDriveAudioSource({
  availability: { status: 'available' },
  driveFileId: 'drive-file-tagged',
  durationMs: 245000,
  mimeType: 'audio/mpeg',
  modifiedTime: '2026-07-05T09:00:00.000Z',
  name: 'Alto Warmup.mp3',
  tags: ['Alto'],
});

const UNTAGGED_SOURCE = createDriveAudioSource({
  availability: { status: 'available' },
  driveFileId: 'drive-file-untagged',
  durationMs: 245000,
  mimeType: 'audio/mpeg',
  modifiedTime: '2026-07-05T09:00:00.000Z',
  name: 'Bass Warmup.mp3',
});

const SAVED_LOOP: NamedLoop = {
  createdAt: '2026-07-01T00:00:00.000Z',
  endMs: 24000,
  id: 'loop-1',
  name: 'Verse entrance',
  ownerId: 'user-1',
  sourceId: TAGGED_SOURCE.id,
  sourceName: TAGGED_SOURCE.name,
  startMs: 12000,
  updatedAt: '2026-07-01T00:00:00.000Z',
};

describe('folderContainsMatchingEntity', () => {
  it('is trivially true when no filter is active and the subtree has an entity', () => {
    const tree: RehearsalLibraryFileTree = {
      fileLinks: [
        {
          entityId: UNTAGGED_SOURCE.id,
          entityKind: 'track',
          id: `file-link:track:${UNTAGGED_SOURCE.id}`,
          parentFolderId: ROOT_FOLDER.id,
        },
      ],
      folders: [ROOT_FOLDER],
      rootFolderId: ROOT_FOLDER.id,
      version: 1,
    };

    const result = folderContainsMatchingEntity({
      entityFilter: 'all',
      folderId: ROOT_FOLDER.id,
      matchMode: 'all',
      savedLoopsById: new Map(),
      savedPlaylistsById: new Map(),
      savedSourcesById: new Map([[UNTAGGED_SOURCE.id, UNTAGGED_SOURCE]]),
      selectedTags: [],
      tree,
    });

    assert.equal(result, true);
  });

  it('finds a matching entity one level down', () => {
    const childFolder = {
      id: 'folder-child',
      name: 'Warmups',
      parentFolderId: ROOT_FOLDER.id,
      createdAt: '2026-05-10T10:00:00.000Z',
    };
    const tree: RehearsalLibraryFileTree = {
      fileLinks: [
        {
          entityId: UNTAGGED_SOURCE.id,
          entityKind: 'track',
          id: `file-link:track:${UNTAGGED_SOURCE.id}`,
          parentFolderId: childFolder.id,
        },
      ],
      folders: [ROOT_FOLDER, childFolder],
      rootFolderId: ROOT_FOLDER.id,
      version: 1,
    };

    const result = folderContainsMatchingEntity({
      entityFilter: 'tracks',
      folderId: ROOT_FOLDER.id,
      matchMode: 'all',
      savedLoopsById: new Map(),
      savedPlaylistsById: new Map(),
      savedSourcesById: new Map([[UNTAGGED_SOURCE.id, UNTAGGED_SOURCE]]),
      selectedTags: [],
      tree,
    });

    assert.equal(result, true);
  });

  it('finds a matching entity several levels down', () => {
    const childFolder = {
      id: 'folder-child',
      name: 'Warmups',
      parentFolderId: ROOT_FOLDER.id,
      createdAt: '2026-05-10T10:00:00.000Z',
    };
    const grandchildFolder = {
      id: 'folder-grandchild',
      name: 'Entrances',
      parentFolderId: childFolder.id,
      createdAt: '2026-05-10T10:00:00.000Z',
    };
    const tree: RehearsalLibraryFileTree = {
      fileLinks: [
        {
          entityId: SAVED_LOOP.id,
          entityKind: 'loop',
          id: `file-link:loop:${SAVED_LOOP.id}`,
          parentFolderId: grandchildFolder.id,
        },
      ],
      folders: [ROOT_FOLDER, childFolder, grandchildFolder],
      rootFolderId: ROOT_FOLDER.id,
      version: 1,
    };

    const result = folderContainsMatchingEntity({
      entityFilter: 'loops',
      folderId: ROOT_FOLDER.id,
      matchMode: 'all',
      savedLoopsById: new Map([[SAVED_LOOP.id, SAVED_LOOP]]),
      savedPlaylistsById: new Map(),
      savedSourcesById: new Map(),
      selectedTags: [],
      tree,
    });

    assert.equal(result, true);
  });

  it('returns false when no matching entity exists anywhere in the subtree', () => {
    const childFolder = {
      id: 'folder-child',
      name: 'Warmups',
      parentFolderId: ROOT_FOLDER.id,
      createdAt: '2026-05-10T10:00:00.000Z',
    };
    const tree: RehearsalLibraryFileTree = {
      fileLinks: [
        {
          entityId: UNTAGGED_SOURCE.id,
          entityKind: 'track',
          id: `file-link:track:${UNTAGGED_SOURCE.id}`,
          parentFolderId: childFolder.id,
        },
      ],
      folders: [ROOT_FOLDER, childFolder],
      rootFolderId: ROOT_FOLDER.id,
      version: 1,
    };

    const result = folderContainsMatchingEntity({
      entityFilter: 'loops',
      folderId: ROOT_FOLDER.id,
      matchMode: 'all',
      savedLoopsById: new Map(),
      savedPlaylistsById: new Map(),
      savedSourcesById: new Map([[UNTAGGED_SOURCE.id, UNTAGGED_SOURCE]]),
      selectedTags: [],
      tree,
    });

    assert.equal(result, false);
  });

  it('requires both entity-filter and tag-filter to pass when combined', () => {
    const tree: RehearsalLibraryFileTree = {
      fileLinks: [
        {
          entityId: TAGGED_SOURCE.id,
          entityKind: 'track',
          id: `file-link:track:${TAGGED_SOURCE.id}`,
          parentFolderId: ROOT_FOLDER.id,
        },
        {
          entityId: UNTAGGED_SOURCE.id,
          entityKind: 'track',
          id: `file-link:track:${UNTAGGED_SOURCE.id}`,
          parentFolderId: ROOT_FOLDER.id,
        },
      ],
      folders: [ROOT_FOLDER],
      rootFolderId: ROOT_FOLDER.id,
      version: 1,
    };
    const savedSourcesById = new Map([
      [TAGGED_SOURCE.id, TAGGED_SOURCE],
      [UNTAGGED_SOURCE.id, UNTAGGED_SOURCE],
    ]);

    const matchesTypeOnly = folderContainsMatchingEntity({
      entityFilter: 'tracks',
      folderId: ROOT_FOLDER.id,
      matchMode: 'all',
      savedLoopsById: new Map(),
      savedPlaylistsById: new Map(),
      savedSourcesById,
      selectedTags: ['soprano'],
      tree,
    });

    assert.equal(matchesTypeOnly, false);

    const matchesBoth = folderContainsMatchingEntity({
      entityFilter: 'tracks',
      folderId: ROOT_FOLDER.id,
      matchMode: 'all',
      savedLoopsById: new Map(),
      savedPlaylistsById: new Map(),
      savedSourcesById,
      selectedTags: ['alto'],
      tree,
    });

    assert.equal(matchesBoth, true);
  });

  it('ignores a subfolder that is itself tagged but has no matching descendant entity', () => {
    const taggedChildFolder = {
      id: 'folder-child',
      name: 'Alto',
      parentFolderId: ROOT_FOLDER.id,
      createdAt: '2026-05-10T10:00:00.000Z',
      tags: ['Alto'],
    };
    const tree: RehearsalLibraryFileTree = {
      fileLinks: [
        {
          entityId: UNTAGGED_SOURCE.id,
          entityKind: 'track',
          id: `file-link:track:${UNTAGGED_SOURCE.id}`,
          parentFolderId: taggedChildFolder.id,
        },
      ],
      folders: [ROOT_FOLDER, taggedChildFolder],
      rootFolderId: ROOT_FOLDER.id,
      version: 1,
    };

    const result = folderContainsMatchingEntity({
      entityFilter: 'all',
      folderId: taggedChildFolder.id,
      matchMode: 'all',
      savedLoopsById: new Map(),
      savedPlaylistsById: new Map(),
      savedSourcesById: new Map([[UNTAGGED_SOURCE.id, UNTAGGED_SOURCE]]),
      selectedTags: ['alto'],
      tree,
    });

    assert.equal(result, false);
  });
});
