import assert from 'node:assert/strict';
import { describe, it } from 'node:test';

import {
  createDriveAudioSource,
  type NamedLoop,
  type Playlist,
} from '@org/audio-library-models';

import {
  REHEARSAL_LIBRARY_ROOT_FOLDER_ID,
  removeRehearsalLibraryFileLinkNode,
  syncRehearsalLibraryFileTree,
  upsertRehearsalLibraryFileLinkNode,
  upsertRehearsalLibraryFolderNode,
} from './rehearsal-library-files';

const AVAILABLE_SOURCE = createDriveAudioSource({
  driveFileId: 'drive-file-1',
  name: 'Full Choir.mp3',
  mimeType: 'audio/mpeg',
  durationMs: 240000,
  availability: {
    status: 'available',
  },
});

const SAVED_LOOP: NamedLoop = {
  id: 'loop-1',
  name: 'Verse entrance',
  sourceId: AVAILABLE_SOURCE.id,
  sourceName: AVAILABLE_SOURCE.name,
  startMs: 12000,
  endMs: 24000,
  ownerId: 'user-1',
  createdAt: '2026-05-10T00:00:00.000Z',
  updatedAt: '2026-05-10T00:00:00.000Z',
};

const PLAYLIST: Playlist = {
  id: 'playlist-1',
  name: 'Warmups',
  items: [],
  ownerId: 'user-1',
  createdAt: '2026-05-10T00:00:00.000Z',
  updatedAt: '2026-05-10T00:00:00.000Z',
};

describe('rehearsal-library file-tree helpers', () => {
  it('preserves hard links, drops missing entities, and restores missing default links during sync', () => {
    const synchronizedTree = syncRehearsalLibraryFileTree({
      existingTree: {
        version: 1,
        rootFolderId: REHEARSAL_LIBRARY_ROOT_FOLDER_ID,
        folders: [
          {
            id: REHEARSAL_LIBRARY_ROOT_FOLDER_ID,
            name: 'Old root name',
            parentFolderId: null,
          },
          {
            id: 'folder-1',
            name: 'Warmups',
            parentFolderId: REHEARSAL_LIBRARY_ROOT_FOLDER_ID,
          },
        ],
        fileLinks: [
          {
            id: `file-link:track:${AVAILABLE_SOURCE.id}`,
            parentFolderId: REHEARSAL_LIBRARY_ROOT_FOLDER_ID,
            entityKind: 'track',
            entityId: AVAILABLE_SOURCE.id,
          },
          {
            id: 'file-link:track:copy-1',
            parentFolderId: 'missing-folder',
            entityKind: 'track',
            entityId: AVAILABLE_SOURCE.id,
            visibleName: 'Warmup copy',
          },
          {
            id: 'file-link:loop:missing',
            parentFolderId: 'folder-1',
            entityKind: 'loop',
            entityId: 'loop-missing',
          },
        ],
      },
      entityCollections: {
        loops: [SAVED_LOOP],
        playlists: [PLAYLIST],
        sources: [AVAILABLE_SOURCE],
      },
    });

    assert.deepEqual(synchronizedTree, {
      version: 1,
      rootFolderId: REHEARSAL_LIBRARY_ROOT_FOLDER_ID,
      folders: [
        {
          id: REHEARSAL_LIBRARY_ROOT_FOLDER_ID,
          name: 'Library',
          parentFolderId: null,
        },
        {
          id: 'folder-1',
          name: 'Warmups',
          parentFolderId: REHEARSAL_LIBRARY_ROOT_FOLDER_ID,
        },
      ],
      fileLinks: [
        {
          id: `file-link:track:${AVAILABLE_SOURCE.id}`,
          parentFolderId: REHEARSAL_LIBRARY_ROOT_FOLDER_ID,
          entityKind: 'track',
          entityId: AVAILABLE_SOURCE.id,
        },
        {
          id: 'file-link:track:copy-1',
          parentFolderId: REHEARSAL_LIBRARY_ROOT_FOLDER_ID,
          entityKind: 'track',
          entityId: AVAILABLE_SOURCE.id,
          visibleName: 'Warmup copy',
        },
        {
          id: `file-link:loop:${SAVED_LOOP.id}`,
          parentFolderId: REHEARSAL_LIBRARY_ROOT_FOLDER_ID,
          entityKind: 'loop',
          entityId: SAVED_LOOP.id,
        },
        {
          id: `file-link:playlist:${PLAYLIST.id}`,
          parentFolderId: REHEARSAL_LIBRARY_ROOT_FOLDER_ID,
          entityKind: 'playlist',
          entityId: PLAYLIST.id,
        },
      ],
    });
  });

  it('updates folder and file-link nodes by id and removes only the requested link', () => {
    const treeWithFolder = upsertRehearsalLibraryFolderNode(
      {
        version: 1,
        rootFolderId: REHEARSAL_LIBRARY_ROOT_FOLDER_ID,
        folders: [
          {
            id: REHEARSAL_LIBRARY_ROOT_FOLDER_ID,
            name: 'Library',
            parentFolderId: null,
          },
        ],
        fileLinks: [
          {
            id: `file-link:track:${AVAILABLE_SOURCE.id}`,
            parentFolderId: REHEARSAL_LIBRARY_ROOT_FOLDER_ID,
            entityKind: 'track',
            entityId: AVAILABLE_SOURCE.id,
          },
        ],
      },
      {
        id: 'folder-1',
        name: 'Warmups',
        parentFolderId: REHEARSAL_LIBRARY_ROOT_FOLDER_ID,
      },
    );

    const treeWithRenamedFolder = upsertRehearsalLibraryFolderNode(
      treeWithFolder,
      {
        id: 'folder-1',
        name: 'Updated warmups',
        parentFolderId: REHEARSAL_LIBRARY_ROOT_FOLDER_ID,
      },
    );

    const treeWithHardLink = upsertRehearsalLibraryFileLinkNode(
      treeWithRenamedFolder,
      {
        id: 'file-link:track:copy-1',
        parentFolderId: 'folder-1',
        entityKind: 'track',
        entityId: AVAILABLE_SOURCE.id,
        visibleName: 'Warmup copy',
      },
    );

    const treeWithRenamedHardLink = upsertRehearsalLibraryFileLinkNode(
      treeWithHardLink,
      {
        id: 'file-link:track:copy-1',
        parentFolderId: 'folder-1',
        entityKind: 'track',
        entityId: AVAILABLE_SOURCE.id,
        visibleName: 'Warmup copy 2',
      },
    );

    const treeWithoutHardLink = removeRehearsalLibraryFileLinkNode(
      treeWithRenamedHardLink,
      'file-link:track:copy-1',
    );

    assert.equal(treeWithRenamedFolder.folders.length, 2);
    assert.deepEqual(treeWithRenamedFolder.folders[1], {
      id: 'folder-1',
      name: 'Updated warmups',
      parentFolderId: REHEARSAL_LIBRARY_ROOT_FOLDER_ID,
    });
    assert.equal(treeWithRenamedHardLink.fileLinks.length, 2);
    assert.equal(
      treeWithRenamedHardLink.fileLinks.find(
        (fileLink) => fileLink.id === 'file-link:track:copy-1',
      )?.visibleName,
      'Warmup copy 2',
    );
    assert.deepEqual(treeWithoutHardLink.fileLinks, [
      {
        id: `file-link:track:${AVAILABLE_SOURCE.id}`,
        parentFolderId: REHEARSAL_LIBRARY_ROOT_FOLDER_ID,
        entityKind: 'track',
        entityId: AVAILABLE_SOURCE.id,
      },
    ]);
  });
});
