import assert from 'node:assert/strict';
import { describe, it } from 'node:test';

import {
  expandSelectionForPlayback,
  getBlockedPlaylistTargetIds,
  type BulkSelectionItem,
  type FolderChild,
  type PlaybackExpansionContext,
  type PlaybackRef,
} from './playback-expansion.js';

const folderChildren: Record<string, FolderChild[]> = {
  advent: [
    { entityId: 'carol-a', kind: 'track' },
    { folderId: 'advent-loops', kind: 'folder' },
    { entityId: 'playlist-x', kind: 'playlist' },
    { entityId: 'carol-b', kind: 'track' },
  ],
  'advent-loops': [{ entityId: 'loop-1', kind: 'loop' }],
  empty: [],
  // A malformed tree that points back at its parent must not loop forever.
  cyclic: [{ folderId: 'cyclic', kind: 'folder' }],
};
const playlistRefs: Record<string, PlaybackRef[]> = {
  'playlist-x': [
    { entityId: 'carol-b', kind: 'track' },
    { entityId: 'loop-1', kind: 'loop' },
    { entityId: 'carol-b', kind: 'track' },
  ],
  'playlist-empty': [],
};
const context: PlaybackExpansionContext = {
  getFolderChildren: (folderId) => folderChildren[folderId] ?? [],
  getPlaylistRefs: (playlistId) => playlistRefs[playlistId] ?? [],
};
const ids = (refs: PlaybackRef[]) => refs.map(({ entityId }) => entityId);

describe('expandSelectionForPlayback', () => {
  it('lets tracks and loops contribute themselves', () => {
    const items: BulkSelectionItem[] = [
      { entityId: 't1', key: 'k1', kind: 'track' },
      { entityId: 'l1', key: 'k2', kind: 'loop' },
    ];

    assert.deepEqual(expandSelectionForPlayback(items, context), {
      emptyContainerCount: 0,
      refs: [
        { entityId: 't1', kind: 'track' },
        { entityId: 'l1', kind: 'loop' },
      ],
    });
  });

  it('expands a folder depth-first in display order and skips playlist links', () => {
    const { refs } = expandSelectionForPlayback(
      [{ folderId: 'advent', key: 'f', kind: 'folder' }],
      context,
    );

    assert.deepEqual(ids(refs), ['carol-a', 'loop-1', 'carol-b']);
  });

  it('expands a playlist into its entries in playlist order, repeats included', () => {
    const { refs } = expandSelectionForPlayback(
      [{ key: 'p', kind: 'playlist', playlistId: 'playlist-x' }],
      context,
    );

    assert.deepEqual(ids(refs), ['carol-b', 'loop-1', 'carol-b']);
  });

  it('applies mixed selections in the order they are displayed', () => {
    const { refs } = expandSelectionForPlayback(
      [
        { entityId: 'solo', key: 'a', kind: 'track' },
        { folderId: 'advent-loops', key: 'b', kind: 'folder' },
        { key: 'c', kind: 'playlist', playlistId: 'playlist-x' },
      ],
      context,
    );

    assert.deepEqual(ids(refs), [
      'solo',
      'loop-1',
      'carol-b',
      'loop-1',
      'carol-b',
    ]);
  });

  it('keeps a playlist entry as the single occurrence it is', () => {
    const { refs } = expandSelectionForPlayback(
      [
        {
          entityId: 'carol-b',
          entityKind: 'track',
          key: 'entry-2',
          kind: 'playlist-entry',
        },
      ],
      context,
    );

    assert.deepEqual(refs, [{ entityId: 'carol-b', kind: 'track' }]);
  });

  it('counts selected folders and playlists that contribute nothing', () => {
    const result = expandSelectionForPlayback(
      [
        { folderId: 'empty', key: 'a', kind: 'folder' },
        { key: 'b', kind: 'playlist', playlistId: 'playlist-empty' },
        { entityId: 't1', key: 'c', kind: 'track' },
      ],
      context,
    );

    assert.equal(result.emptyContainerCount, 2);
    assert.deepEqual(ids(result.refs), ['t1']);
  });

  it('stops at a folder cycle instead of looping', () => {
    const result = expandSelectionForPlayback(
      [{ folderId: 'cyclic', key: 'a', kind: 'folder' }],
      context,
    );

    assert.deepEqual(result.refs, []);
    assert.equal(result.emptyContainerCount, 1);
  });
});

describe('getBlockedPlaylistTargetIds', () => {
  it('blocks only the playlists that are in the selection', () => {
    const blocked = getBlockedPlaylistTargetIds([
      { key: 'a', kind: 'playlist', playlistId: 'p1' },
      { entityId: 't1', key: 'b', kind: 'track' },
      { key: 'c', kind: 'playlist', playlistId: 'p2' },
    ]);

    assert.deepEqual([...blocked].sort(), ['p1', 'p2']);
  });
});
