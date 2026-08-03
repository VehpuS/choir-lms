import assert from 'node:assert/strict';
import { describe, it } from 'node:test';

import {
  addLoopToPlaylist,
  addTrackToPlaylist,
  createDriveAudioSource,
  createPlaylist,
  type NamedLoop,
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

const LOOP: NamedLoop = {
  createdAt: '2026-07-01T00:00:00.000Z',
  endMs: 24000,
  id: 'loop-1',
  name: 'Verse entrance',
  ownerId: 'user-1',
  ownershipScope: 'user',
  sourceId: SOURCE.id,
  sourceName: SOURCE.name,
  startMs: 12000,
  updatedAt: '2026-07-01T00:00:00.000Z',
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

    const result = await operations.createFileLinkCopy({
      destinationFolderId: 'folder-warmups',
      fileLink: ROOT_FILE_LINK,
      sourceName: SOURCE.name,
    });

    assert.equal(result.didComplete, true);
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

  it('counts track remove impact across loops, links, and playlist entries', () => {
    const playlist = addLoopToPlaylist(
      addTrackToPlaylist(
        createPlaylist({
          createdAt: '2026-07-01T00:00:00.000Z',
          name: 'Warmups',
          ownerId: 'user-1',
        }),
        SOURCE,
        '2026-07-01T00:01:00.000Z',
      ),
      LOOP,
      '2026-07-01T00:02:00.000Z',
    );
    const repository = {} as AsyncStoragePracticeRepository;
    const operations = createLibraryFilesOperations({
      explorer: null,
      options: {
        savedLoops: [LOOP],
        savedPlaylists: [playlist],
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
          id: 'file-link:track:copy',
          parentFolderId: 'folder-warmups',
          visibleName: `${SOURCE.name} Copy`,
        },
      ]),
    });

    assert.deepEqual(operations.getTrackRemoveFromLibraryImpact(SOURCE.id), {
      fileLinkCount: 2,
      fileLinkNames: [
        'Full Choir.mp3 (Library)',
        'Full Choir.mp3 Copy (Warmups)',
      ],
      loopCount: 1,
      loopNames: ['Verse entrance'],
      playlistEntryCount: 2,
      playlistEntryTitles: [
        'Warmups: Full Choir.mp3',
        'Warmups: Verse entrance',
      ],
    });
  });

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
        currentFolder: {
          id: REHEARSAL_LIBRARY_ROOT_FOLDER_ID,
          name: 'Library',
          parentFolderId: null,
        },
      } as NonNullable<
        ReturnType<typeof createLibraryFilesOperations>['explorer']
      >,
      options: {
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
