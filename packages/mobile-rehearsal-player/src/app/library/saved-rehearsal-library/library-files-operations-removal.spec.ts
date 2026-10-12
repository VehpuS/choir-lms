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

describe('library-files removal refreshes', () => {
  it('refreshes saved sources, loops, and playlists after a last-link track delete', async () => {
    let currentTree = createTree([ROOT_FILE_LINK]);
    const repository = {
      async deleteLibraryFileLink(_ownerId: string, fileLinkId: string) {
        currentTree = {
          ...currentTree,
          fileLinks: currentTree.fileLinks.filter((fileLink) => {
            return fileLink.id !== fileLinkId;
          }),
        };

        return currentTree;
      },
    } as unknown as AsyncStoragePracticeRepository;
    const refreshedCollections: string[] = [];
    const operations = createLibraryFilesOperations({
      explorer: null,
      options: {
        async refreshSavedLoops() {
          refreshedCollections.push('loops');
        },
        async refreshSavedPlaylists() {
          refreshedCollections.push('playlists');
        },
        async refreshSavedSources() {
          refreshedCollections.push('sources');
        },
        savedLoops: [],
        savedPlaylists: [],
        savedSources: [SOURCE],
      },
      practiceRepository: repository,
      setCurrentFolderId: () => undefined,
      setIssue: () => undefined,
      setTree: (nextTree) => {
        currentTree = nextTree as RehearsalLibraryFileTree;
      },
      tree: currentTree,
    });

    const didDelete = await operations.deleteFileLink(ROOT_FILE_LINK.id);

    assert.equal(didDelete, true);
    assert.deepEqual(
      new Set(refreshedCollections),
      new Set(['sources', 'loops', 'playlists']),
    );
  });

  it('does not refresh saved entity caches when another link to the entity remains', async () => {
    const copyFileLink: RehearsalLibraryFileLinkNode = {
      entityId: SOURCE.id,
      entityKind: 'track',
      id: 'file-link:track:copy',
      parentFolderId: 'folder-warmups',
    };
    let currentTree = createTree([ROOT_FILE_LINK, copyFileLink]);
    const repository = {
      async deleteLibraryFileLink(_ownerId: string, fileLinkId: string) {
        currentTree = {
          ...currentTree,
          fileLinks: currentTree.fileLinks.filter((fileLink) => {
            return fileLink.id !== fileLinkId;
          }),
        };

        return currentTree;
      },
    } as unknown as AsyncStoragePracticeRepository;
    const refreshedCollections: string[] = [];
    const operations = createLibraryFilesOperations({
      explorer: null,
      options: {
        async refreshSavedLoops() {
          refreshedCollections.push('loops');
        },
        async refreshSavedPlaylists() {
          refreshedCollections.push('playlists');
        },
        async refreshSavedSources() {
          refreshedCollections.push('sources');
        },
        savedLoops: [],
        savedPlaylists: [],
        savedSources: [SOURCE],
      },
      practiceRepository: repository,
      setCurrentFolderId: () => undefined,
      setIssue: () => undefined,
      setTree: (nextTree) => {
        currentTree = nextTree as RehearsalLibraryFileTree;
      },
      tree: currentTree,
    });

    const didDelete = await operations.deleteFileLink(copyFileLink.id);

    assert.equal(didDelete, true);
    assert.deepEqual(refreshedCollections, []);
  });
});
