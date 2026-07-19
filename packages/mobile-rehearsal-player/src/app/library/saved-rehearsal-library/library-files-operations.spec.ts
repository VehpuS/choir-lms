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

import { createLibraryFilesImpactReaders } from './library-files-operation-helpers';
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
      },
      {
        id: 'folder-warmups',
        name: 'Warmups',
        parentFolderId: REHEARSAL_LIBRARY_ROOT_FOLDER_ID,
      },
    ],
    rootFolderId: REHEARSAL_LIBRARY_ROOT_FOLDER_ID,
    version: 1,
  };
};

describe('library-files operations', () => {
  it('creates a hard-link copy without moving the original file link', async () => {
    const existingCopy: RehearsalLibraryFileLinkNode = {
      entityId: SOURCE.id,
      entityKind: 'track',
      id: 'file-link:track:existing-copy',
      parentFolderId: 'folder-warmups',
      visibleName: `${SOURCE.name} Copy`,
    };
    let currentTree = createTree([ROOT_FILE_LINK, existingCopy]);
    const repository = {
      async saveLibraryFileLink(
        _ownerId: string,
        fileLink: RehearsalLibraryFileLinkNode,
      ) {
        currentTree = {
          ...currentTree,
          fileLinks: [...currentTree.fileLinks, fileLink],
        };

        return currentTree;
      },
    } as unknown as AsyncStoragePracticeRepository;
    const operations = createLibraryFilesOperations({
      explorer: null,
      options: {
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

    const didCopy = await operations.createFileLinkCopy({
      destinationFolderId: 'folder-warmups',
      fileLink: ROOT_FILE_LINK,
      sourceName: SOURCE.name,
    });

    assert.equal(didCopy, true);
    const copiedFileLink = currentTree.fileLinks.find((fileLink) => {
      return fileLink.visibleName === `${SOURCE.name} Copy 2`;
    });

    assert.ok(copiedFileLink);
    assert.equal(copiedFileLink.entityKind, ROOT_FILE_LINK.entityKind);
    assert.equal(copiedFileLink.entityId, ROOT_FILE_LINK.entityId);
    assert.equal(copiedFileLink.parentFolderId, 'folder-warmups');
    assert.equal(
      currentTree.fileLinks.some((fileLink) => {
        return fileLink.id === ROOT_FILE_LINK.id;
      }),
      true,
    );
    assert.equal(
      currentTree.fileLinks.filter((fileLink) => {
        return fileLink.entityId === SOURCE.id;
      }).length,
      3,
    );
  });

  it('distinguishes pointer-only deletion from last-link deletion impact', () => {
    const copyFileLink: RehearsalLibraryFileLinkNode = {
      entityId: SOURCE.id,
      entityKind: 'track',
      id: 'file-link:track:copy',
      parentFolderId: 'folder-warmups',
    };

    assert.equal(
      createLibraryFilesImpactReaders(
        createTree([ROOT_FILE_LINK, copyFileLink]),
      ).getFileLinkDeleteImpact(ROOT_FILE_LINK).isLastLink,
      false,
    );
    assert.equal(
      createLibraryFilesImpactReaders(
        createTree([ROOT_FILE_LINK]),
      ).getFileLinkDeleteImpact(ROOT_FILE_LINK).isLastLink,
      true,
    );
  });

  it('keeps root-folder impact explicit while counting root-visible links', () => {
    const impact = createLibraryFilesImpactReaders(
      createTree(),
    ).getFolderDeleteImpact(REHEARSAL_LIBRARY_ROOT_FOLDER_ID);

    assert.ok(impact);
    assert.equal(impact.isRootFolder, true);
    assert.equal(impact.folderCount, 1);
    assert.equal(impact.trackLinkCount, 1);
    assert.equal(impact.lastLinkCount, 1);
  });
});
