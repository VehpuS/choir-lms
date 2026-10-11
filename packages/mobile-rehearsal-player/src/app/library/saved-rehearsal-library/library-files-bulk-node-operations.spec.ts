import assert from 'node:assert/strict';
import { describe, it } from 'node:test';

import type { RehearsalLibraryFileTree } from '@org/audio-library-models';
import type { AsyncStoragePracticeRepository } from '@org/audio-library-runtime';

import { createLibraryFilesBulkNodeOperations } from './library-files-bulk-node-operations';

const emptyTree: RehearsalLibraryFileTree = {
  fileLinks: [],
  folders: [],
  rootFolderId: 'root',
  version: 1,
};
const plan = {
  fileLinkIds: ['l1', 'l2'],
  folderCount: 1,
  lastLinkCount: 0,
  lastLinkLoopCount: 0,
  lastLinkPlaylistCount: 0,
  lastLinkTrackCount: 0,
  linkCount: 2,
  selectedFolderCount: 1,
  selectedLinkCount: 1,
  topFolderIds: ['f1'],
};

// The runtime repository's rules are tested in audio-library-runtime; this
// fake only records which repository calls the app wrapper makes and in what
// order, which is what these tests pin.
const createHarness = (options: { failOn?: string } = {}) => {
  const calls: string[] = [];
  let latestTree: RehearsalLibraryFileTree | null = null;
  const guard = (name: string) => {
    calls.push(name);

    if (options.failOn === name) {
      throw new Error(`${name} failed`);
    }
  };
  const repository = {
    deleteLibraryFolderNode: async (_owner: string, folderId: string) => {
      guard(`deleteFolder:${folderId}`);
      return { ...emptyTree, version: 1 as const };
    },
    listLibraryFileTree: async () => emptyTree,
    removeLibraryFileLinks: async (_owner: string, ids: string[]) => {
      guard(`removeLinks:${ids.join(',')}`);
      return { collections: {}, tree: emptyTree };
    },
    saveLibraryNodes: async (
      _owner: string,
      nodes: { fileLinks?: { id: string }[]; folders?: { id: string }[] },
    ) => {
      guard(
        `saveNodes:${(nodes.fileLinks ?? []).map(({ id }) => id).join(',')}|${(nodes.folders ?? []).map(({ id }) => id).join(',')}`,
      );
      return emptyTree;
    },
  } as unknown as AsyncStoragePracticeRepository;
  let refreshCount = 0;
  const operations = createLibraryFilesBulkNodeOperations({
    practiceRepository: repository,
    refreshAllEntities: async () => {
      refreshCount += 1;
    },
    setIssue: () => undefined,
    setTree: (value) => {
      latestTree = value as RehearsalLibraryFileTree;
    },
    tree: emptyTree,
  });

  return {
    calls,
    getLatestTree: () => latestTree,
    getRefreshCount: () => refreshCount,
    operations,
  };
};

describe('createLibraryFilesBulkNodeOperations', () => {
  it('deletes the links in one write before the folders, then refreshes entities once', async () => {
    const harness = createHarness();
    const result = await harness.operations.deleteNodes(plan);

    assert.equal(result.didComplete, true);
    assert.deepEqual(harness.calls, ['removeLinks:l1,l2', 'deleteFolder:f1']);
    assert.equal(harness.getRefreshCount(), 1);
    assert.notEqual(harness.getLatestTree(), null);
  });

  it('reports a failure without deleting folders after a failed link removal', async () => {
    const harness = createHarness({ failOn: 'removeLinks:l1,l2' });
    const result = await harness.operations.deleteNodes(plan);

    assert.equal(result.didComplete, false);
    assert.equal(result.issue?.title, 'Could not delete from folder');
    assert.deepEqual(harness.calls, ['removeLinks:l1,l2']);
  });

  it('undoes a copy by removing the links it created', async () => {
    const harness = createHarness();
    const result = await harness.operations.undoPlacement({
      fileLinkIds: ['copy-1'],
      mode: 'copy',
      originals: [],
    });

    assert.equal(result.didComplete, true);
    assert.deepEqual(harness.calls, ['removeLinks:copy-1']);
  });

  it('undoes a move by saving the original nodes back in one write', async () => {
    const harness = createHarness();
    const result = await harness.operations.undoPlacement({
      fileLinkIds: ['l1'],
      mode: 'move',
      originals: [
        {
          fileLink: {
            entityId: 't',
            entityKind: 'track',
            id: 'l1',
            parentFolderId: 'old',
          },
          kind: 'link',
        },
        {
          folder: {
            createdAt: '2026-01-01T00:00:00.000Z',
            id: 'f1',
            name: 'Verses',
            parentFolderId: 'old',
          },
          kind: 'folder',
        },
      ],
    });

    assert.equal(result.didComplete, true);
    assert.deepEqual(harness.calls, ['saveNodes:l1|f1']);
  });
});
