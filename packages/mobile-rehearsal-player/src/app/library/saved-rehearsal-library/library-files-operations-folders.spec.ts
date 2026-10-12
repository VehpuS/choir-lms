import assert from 'node:assert/strict';
import { describe, it } from 'node:test';

import {
  createDriveAudioSource,
  type RehearsalLibraryFileLinkNode,
  type RehearsalLibraryFileTree,
  type RehearsalLibraryFolderNode,
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

describe('library-files folder operations', () => {
  it('suggests a unique folder name after a duplicate folder-create conflict', async () => {
    const capturedIssues: unknown[] = [];
    const repository = {
      async saveLibraryFolderNode() {
        throw new Error(
          'An item named "Warmups" already exists in the target folder.',
        );
      },
    } as unknown as AsyncStoragePracticeRepository;
    const operations = createLibraryFilesOperations({
      explorer: {
        breadcrumbs: [],
        currentFolder: {
          createdAt: '2026-05-10T10:00:00.000Z',
          id: REHEARSAL_LIBRARY_ROOT_FOLDER_ID,
          name: 'Library',
          parentFolderId: null,
        },
        rows: [],
      },
      options: {
        ...createNoopRefreshCallbacks(),
        savedLoops: [],
        savedPlaylists: [],
        savedSources: [SOURCE],
      },
      practiceRepository: repository,
      setCurrentFolderId: () => undefined,
      setIssue: (issue) => {
        capturedIssues.push(issue);
      },
      setTree: () => undefined,
      tree: createTree(),
    });

    const result = await operations.createFolder('Warmups');

    assert.equal(result.didComplete, false);
    assert.deepEqual(result.issue?.recovery, {
      kind: 'use-suggested-name',
      label: 'Use "Warmups Copy"',
      suggestedName: 'Warmups Copy',
    });
    assert.equal(capturedIssues.length, 1);
  });

  it('saves updated folder tags and refreshes the tree', async () => {
    const savedFolders: unknown[] = [];
    const nextTree = createTree();
    const repository = {
      async saveLibraryFolderNode(
        _ownerId: string,
        folder: RehearsalLibraryFolderNode,
      ) {
        savedFolders.push(folder);
        return nextTree;
      },
    } as unknown as AsyncStoragePracticeRepository;
    let capturedTree: RehearsalLibraryFileTree | null = null;
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
      setTree: (updater) => {
        capturedTree = typeof updater === 'function' ? updater(null) : updater;
      },
      tree: createTree(),
    });
    const folder = createTree().folders[1];

    if (!folder) {
      throw new Error('Expected the Warmups fixture folder to exist.');
    }

    const result = await operations.saveFolderTags({
      folder,
      tags: ['Alto', 'Warmup'],
    });

    assert.equal(result.didComplete, true);
    assert.deepEqual(savedFolders, [{ ...folder, tags: ['Alto', 'Warmup'] }]);
    assert.deepEqual(capturedTree, nextTree);
  });

  it('surfaces an issue when saving folder tags fails', async () => {
    const capturedIssues: unknown[] = [];
    const repository = {
      async saveLibraryFolderNode() {
        throw new Error('storage unavailable');
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
      setIssue: (issue) => {
        capturedIssues.push(issue);
      },
      setTree: () => undefined,
      tree: createTree(),
    });
    const folder = createTree().folders[1];

    if (!folder) {
      throw new Error('Expected the Warmups fixture folder to exist.');
    }

    const result = await operations.saveFolderTags({
      folder,
      tags: ['Alto'],
    });

    assert.equal(result.didComplete, false);
    assert.equal(capturedIssues.length, 1);
  });
});
