import assert from 'node:assert/strict';
import { describe, it } from 'node:test';

import { createDriveAudioSource } from '@org/audio-library-models';
import type { RehearsalLibraryFileTree } from '@org/audio-library-models';
import {
  AsyncStoragePracticeRepository,
  REHEARSAL_LIBRARY_ROOT_FOLDER_ID,
} from '@org/audio-library-runtime';

import {
  aggregateTrackRemoveImpacts,
  createLibraryFilesBulkOperations,
} from './library-files-bulk-operations';

const impact = (overrides: Partial<ReturnType<typeof empty>> = {}) => ({
  ...empty(),
  ...overrides,
});
const empty = () => ({
  adjustedTrackCount: 0,
  adjustedTrackNames: [] as string[],
  fileLinkCount: 0,
  fileLinkNames: [] as string[],
  loopCount: 0,
  loopNames: [] as string[],
  playlistEntryCount: 0,
  playlistEntryTitles: [] as string[],
});

const sources = [
  { id: 'a', name: 'A' },
  { id: 'a-fast', name: 'A fast', adjustment: { sourceRef: 'a' } },
  { id: 'b', name: 'B' },
] as unknown as Parameters<
  typeof aggregateTrackRemoveImpacts
>[0]['savedSources'];
const impacts: Record<string, ReturnType<typeof empty>> = {
  a: impact({
    adjustedTrackCount: 1,
    adjustedTrackNames: ['A fast'],
    fileLinkCount: 2,
    fileLinkNames: ['A', 'A fast'],
    loopCount: 1,
    loopNames: ['Verse'],
  }),
  'a-fast': impact({ fileLinkCount: 1, fileLinkNames: ['A fast'] }),
  b: impact({
    fileLinkCount: 1,
    fileLinkNames: ['B'],
    playlistEntryCount: 1,
    playlistEntryTitles: ['Set: B'],
  }),
};

describe('aggregateTrackRemoveImpacts', () => {
  it('sums impacts across independent tracks and lists the union of names', () => {
    const result = aggregateTrackRemoveImpacts({
      getImpact: (id) => impacts[id] ?? empty(),
      savedSources: sources,
      sourceIds: ['a', 'b'],
    });

    assert.deepEqual(result.fileLinkNames, ['A', 'A fast', 'B']);
    assert.equal(result.fileLinkCount, 3);
    assert.equal(result.loopCount, 1);
    assert.equal(result.playlistEntryCount, 1);
    assert.equal(result.adjustedTrackCount, 1);
  });

  it('does not count an adjusted track twice when its source is selected too', () => {
    const result = aggregateTrackRemoveImpacts({
      getImpact: (id) => impacts[id] ?? empty(),
      savedSources: sources,
      sourceIds: ['a', 'a-fast'],
    });

    assert.deepEqual(result.fileLinkNames, ['A', 'A fast']);
    assert.equal(result.fileLinkCount, 2);
  });

  it('counts an adjusted track on its own when its source is not selected', () => {
    const result = aggregateTrackRemoveImpacts({
      getImpact: (id) => impacts[id] ?? empty(),
      savedSources: sources,
      sourceIds: ['a-fast'],
    });

    assert.deepEqual(result.fileLinkNames, ['A fast']);
  });
});

// The runtime repository's batch rules are tested in audio-library-runtime;
// these use a lightweight fake repository to pin how the app wrapper plans,
// calls the repository once, and reports.
describe('createLibraryFilesBulkOperations', () => {
  const root = REHEARSAL_LIBRARY_ROOT_FOLDER_ID;
  const sourceA = createDriveAudioSource({
    availability: { status: 'available' },
    driveFileId: 'drive-a',
    durationMs: 1000,
    mimeType: 'audio/mpeg',
    name: 'A.mp3',
  });
  const linkA = {
    entityId: sourceA.id,
    entityKind: 'track' as const,
    id: 'link-a',
    parentFolderId: root,
  };
  const tree: RehearsalLibraryFileTree = {
    fileLinks: [linkA],
    folders: [
      {
        createdAt: '2026-05-10T10:00:00.000Z',
        id: root,
        name: 'Library',
        parentFolderId: null,
      },
      {
        createdAt: '2026-05-10T10:00:00.000Z',
        id: 'dest',
        name: 'Dest',
        parentFolderId: root,
      },
    ],
    rootFolderId: root,
    version: 1,
  };
  const build = (repository: object) => {
    const state = {
      issue: null as unknown,
      refreshes: 0,
      tree: null as unknown,
    };
    const operations = createLibraryFilesBulkOperations({
      options: {
        refreshSavedLoops: async () => void (state.refreshes += 1),
        refreshSavedPlaylists: async () => void (state.refreshes += 1),
        refreshSavedSources: async () => void (state.refreshes += 1),
        savedLoops: [],
        savedPlaylists: [],
        savedSources: [sourceA],
      },
      practiceRepository: repository as AsyncStoragePracticeRepository,
      setIssue: (issue) => void (state.issue = issue),
      setTree: (next) => void (state.tree = next),
      tree,
    });

    return { operations, state };
  };

  it('moves a selection with one repository call and reports the counts', async () => {
    const calls: unknown[] = [];
    const { operations, state } = build({
      saveLibraryNodes: async (_owner: string, nodes: unknown) => {
        calls.push(nodes);
        return tree;
      },
    });
    const plan = operations.planPlacement({
      destinationFolderId: 'dest',
      items: [{ fileLink: linkA, kind: 'link' }],
      mode: 'move',
    });
    const result = await operations.applyPlacement({
      destinationFolderId: 'dest',
      mode: 'move',
      plan,
      resolutions: {},
    });

    assert.equal(calls.length, 1);
    assert.equal(result.didComplete, true);
    assert.equal(result.placedCount, 1);
    assert.equal(result.previousTree, tree);
    assert.equal(state.tree, tree);
  });

  it('does not call the repository when every item is skipped', async () => {
    const { operations } = build({
      saveLibraryNodes: async () => {
        throw new Error('should not be called');
      },
    });
    const plan = operations.planPlacement({
      destinationFolderId: 'dest',
      items: [{ fileLink: linkA, kind: 'link' }],
      mode: 'move',
    });
    const skipped = plan.map((entry) => ({
      ...entry,
      status: 'invalid' as const,
    }));
    const result = await operations.applyPlacement({
      destinationFolderId: 'dest',
      mode: 'move',
      plan: skipped,
      resolutions: {},
    });

    assert.equal(result.didComplete, true);
    assert.equal(result.placedCount, 0);
    assert.equal(result.skippedCount, 1);
  });

  it('reports a failed batch as an issue without changing the tree', async () => {
    const { operations, state } = build({
      saveLibraryNodes: async () => {
        throw new Error('The parent folder "x" does not exist.');
      },
    });
    const plan = operations.planPlacement({
      destinationFolderId: 'dest',
      items: [{ fileLink: linkA, kind: 'link' }],
      mode: 'copy',
    });
    const result = await operations.applyPlacement({
      destinationFolderId: 'dest',
      mode: 'copy',
      plan,
      resolutions: {},
    });

    assert.equal(result.didComplete, false);
    assert.match(result.issue?.title ?? '', /Could not copy items/);
    assert.equal(state.tree, null);
  });

  it('counts the last links a delete from folder would remove', () => {
    const second = { ...linkA, id: 'link-a2', parentFolderId: 'dest' };
    const withTwo = { ...tree, fileLinks: [linkA, second] };
    const operations = createLibraryFilesBulkOperations({
      options: {
        refreshSavedLoops: async () => undefined,
        refreshSavedPlaylists: async () => undefined,
        refreshSavedSources: async () => undefined,
        savedLoops: [],
        savedPlaylists: [],
        savedSources: [sourceA],
      },
      practiceRepository: {} as AsyncStoragePracticeRepository,
      setIssue: () => undefined,
      setTree: () => undefined,
      tree: withTwo,
    });

    assert.deepEqual(operations.getBulkDeleteFromFolderImpact(['link-a']), {
      lastLinkCount: 0,
      lastLinkLoopCount: 0,
      lastLinkPlaylistCount: 0,
      lastLinkTrackCount: 0,
      linkCount: 1,
    });
    assert.equal(
      operations.getBulkDeleteFromFolderImpact(['link-a', 'link-a2'])
        .lastLinkTrackCount,
      1,
    );
  });

  it('refreshes every entity collection once after deleting links', async () => {
    const { operations, state } = build({
      removeLibraryFileLinks: async () => ({ tree }),
    });
    const result = await operations.deleteFileLinks(['link-a']);

    assert.equal(result.didComplete, true);
    assert.equal(state.refreshes, 3);
  });
});
