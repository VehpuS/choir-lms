import assert from 'node:assert/strict';
import { describe, it } from 'node:test';

import {
  createDriveAudioSource,
  type RehearsalLibraryFileLinkNode,
  type RehearsalLibraryFileTree,
} from '@org/audio-library-models';
import {
  AsyncStoragePracticeRepository,
  REHEARSAL_LIBRARY_ROOT_FOLDER_ID,
} from '@org/audio-library-runtime';

import { createLibraryFilesOperations } from './library-files-operations';

const SOURCE = createDriveAudioSource({
  availability: {
    status: 'available',
  },
  driveFileId: 'drive-file-1',
  durationMs: 245000,
  mimeType: 'audio/mpeg',
  name: 'Full Choir.mp3',
});

const ROOT_FILE_LINK: RehearsalLibraryFileLinkNode = {
  entityId: SOURCE.id,
  entityKind: 'track',
  id: `file-link:track:${SOURCE.id}`,
  parentFolderId: REHEARSAL_LIBRARY_ROOT_FOLDER_ID,
};

const createNoopRefreshCallbacks = () => {
  return {
    refreshSavedLoops: async () => undefined,
    refreshSavedPlaylists: async () => undefined,
    refreshSavedSources: async () => undefined,
  };
};

const createTree = (
  fileLinks: RehearsalLibraryFileLinkNode[] = [ROOT_FILE_LINK],
): RehearsalLibraryFileTree => {
  return {
    fileLinks,
    folders: [
      {
        id: REHEARSAL_LIBRARY_ROOT_FOLDER_ID,
        name: 'Library',
        parentFolderId: null,
        createdAt: '2026-05-10T10:00:00.000Z',
      },
      {
        id: 'folder-warmups',
        name: 'Warmups',
        parentFolderId: REHEARSAL_LIBRARY_ROOT_FOLDER_ID,
        createdAt: '2026-05-10T10:00:00.000Z',
      },
    ],
    rootFolderId: REHEARSAL_LIBRARY_ROOT_FOLDER_ID,
    version: 1,
  };
};

describe('library-files operation conflicts', () => {
  it('suggests rename-before-retry after a duplicate move conflict', async () => {
    const repository = {
      async saveLibraryFileLink() {
        throw new Error(
          'An item named "Full Choir.mp3" already exists in the target folder.',
        );
      },
    } as unknown as AsyncStoragePracticeRepository;
    const operations = createLibraryFilesOperations({
      explorer: null,
      options: {
        ...createNoopRefreshCallbacks(),
        savedLoops: [],
        savedPlaylists: [],
        savedSources: [SOURCE],
      },
      practiceRepository: repository,
      setCurrentFolderId: () => undefined,
      setIssue: () => undefined,
      setTree: () => undefined,
      tree: createTree([
        ROOT_FILE_LINK,
        {
          entityId: SOURCE.id,
          entityKind: 'track',
          id: 'file-link:track:copy-1',
          parentFolderId: 'folder-warmups',
          visibleName: `${SOURCE.name} Copy`,
        },
      ]),
    });

    const result = await operations.moveFileLink({
      destinationFolderId: 'folder-warmups',
      fileLink: ROOT_FILE_LINK,
    });

    assert.equal(result.didComplete, false);
    assert.deepEqual(result.issue?.recovery, {
      kind: 'rename-before-retry',
      label: 'Rename to "Full Choir.mp3 Copy 2"',
      suggestedName: 'Full Choir.mp3 Copy 2',
    });
  });

  it('suggests keep-both copy retry after a duplicate copy conflict', async () => {
    const repository = {
      async saveLibraryFileLink() {
        throw new Error(
          'An item named "Full Choir.mp3 Copy" already exists in the target folder.',
        );
      },
    } as unknown as AsyncStoragePracticeRepository;
    const operations = createLibraryFilesOperations({
      explorer: null,
      options: {
        ...createNoopRefreshCallbacks(),
        savedLoops: [],
        savedPlaylists: [],
        savedSources: [SOURCE],
      },
      practiceRepository: repository,
      setCurrentFolderId: () => undefined,
      setIssue: () => undefined,
      setTree: () => undefined,
      tree: createTree([
        ROOT_FILE_LINK,
        {
          entityId: SOURCE.id,
          entityKind: 'track',
          id: 'file-link:track:copy-1',
          parentFolderId: 'folder-warmups',
          visibleName: `${SOURCE.name} Copy`,
        },
      ]),
    });

    const result = await operations.createFileLinkCopy({
      destinationFolderId: 'folder-warmups',
      fileLink: ROOT_FILE_LINK,
      sourceName: SOURCE.name,
      visibleName: `${SOURCE.name} Copy`,
    });

    assert.equal(result.didComplete, false);
    assert.deepEqual(result.issue?.recovery, {
      kind: 'retry-copy-with-suggested-name',
      label: 'Keep both as "Full Choir.mp3 Copy 2"',
      suggestedName: 'Full Choir.mp3 Copy 2',
    });
  });

  it('suggests a unique name after a duplicate rename conflict', async () => {
    const repository = {
      async saveLibraryFileLink() {
        throw new Error(
          'An item named "Practice Copy" already exists in the target folder.',
        );
      },
    } as unknown as AsyncStoragePracticeRepository;
    const operations = createLibraryFilesOperations({
      explorer: null,
      options: {
        ...createNoopRefreshCallbacks(),
        savedLoops: [],
        savedPlaylists: [],
        savedSources: [SOURCE],
      },
      practiceRepository: repository,
      setCurrentFolderId: () => undefined,
      setIssue: () => undefined,
      setTree: () => undefined,
      tree: createTree([
        {
          ...ROOT_FILE_LINK,
          visibleName: 'Practice',
        },
        {
          entityId: SOURCE.id,
          entityKind: 'track',
          id: 'file-link:track:copy-1',
          parentFolderId: REHEARSAL_LIBRARY_ROOT_FOLDER_ID,
          visibleName: 'Practice Copy',
        },
      ]),
    });

    const result = await operations.renameFileLink({
      fileLink: {
        ...ROOT_FILE_LINK,
        visibleName: 'Practice',
      },
      name: 'Practice Copy',
    });

    assert.equal(result.didComplete, false);
    assert.deepEqual(result.issue?.recovery, {
      kind: 'use-suggested-name',
      label: 'Use "Practice Copy 2"',
      suggestedName: 'Practice Copy 2',
    });
  });
});
