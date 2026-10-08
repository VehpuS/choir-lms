import assert from 'node:assert/strict';
import { describe, it } from 'node:test';

import type {
  Playlist,
  RehearsalLibraryFileTree,
} from '@org/audio-library-models';

import { createPlaybackExpansionContext } from './playback-expansion-context.js';
import { expandSelectionForPlayback } from './playback-expansion.js';

const folder = (id: string, parentFolderId: string | null) => ({
  createdAt: '2026-10-01T00:00:00.000Z',
  id,
  name: id,
  parentFolderId,
});
const link = (
  id: string,
  parentFolderId: string,
  entityKind: 'track' | 'loop' | 'playlist',
  entityId: string,
) => ({ entityId, entityKind, id, parentFolderId });

const tree: RehearsalLibraryFileTree = {
  fileLinks: [
    link('l1', 'root', 'track', 'solo'),
    link('l2', 'advent', 'track', 'b-track'),
    link('l3', 'advent', 'track', 'a-track'),
    link('l4', 'advent-sub', 'loop', 'sub-loop'),
    link('l5', 'advent', 'playlist', 'pl'),
  ],
  folders: [
    folder('root', null),
    folder('advent', 'root'),
    folder('advent-sub', 'advent'),
  ],
  rootFolderId: 'root',
  version: 1,
};
const entry = (
  sortIndex: number,
  kind: 'track' | 'loop',
  sourceId: string,
  loopId?: string,
) =>
  ({
    createdAt: '2026-10-01T00:00:00.000Z',
    id: `e${sortIndex}`,
    kind,
    loopId,
    playlistId: 'pl',
    sortIndex,
    sourceId,
    title: 'x',
  }) as Playlist['items'][number];
const playlists = [
  // Stored out of order on purpose: the context must follow sortIndex.
  {
    id: 'pl',
    items: [entry(1, 'loop', 'src', 'loop-9'), entry(0, 'track', 'src-0')],
  },
];

describe('createPlaybackExpansionContext', () => {
  it('expands a folder in the tree order by default, subfolders first', () => {
    const context = createPlaybackExpansionContext({ playlists, tree });
    const { refs } = expandSelectionForPlayback(
      [{ folderId: 'advent', key: 'k', kind: 'folder' }],
      context,
    );

    assert.deepEqual(
      refs.map(({ entityId }) => entityId),
      ['sub-loop', 'b-track', 'a-track'],
    );
  });

  it('follows the Files sort order when one is supplied', () => {
    const context = createPlaybackExpansionContext({
      orderChildren: (_folderId, children) =>
        [...children].sort((first, second) =>
          ('entityId' in first ? first.entityId : 'zzz').localeCompare(
            'entityId' in second ? second.entityId : 'zzz',
          ),
        ),
      playlists,
      tree,
    });
    const { refs } = expandSelectionForPlayback(
      [{ folderId: 'advent', key: 'k', kind: 'folder' }],
      context,
    );

    assert.deepEqual(
      refs.map(({ entityId }) => entityId),
      ['a-track', 'b-track', 'sub-loop'],
    );
  });

  it('expands a playlist by sort index, using the loop for loop entries', () => {
    const context = createPlaybackExpansionContext({ playlists, tree });
    const { refs } = expandSelectionForPlayback(
      [{ key: 'k', kind: 'playlist', playlistId: 'pl' }],
      context,
    );

    assert.deepEqual(refs, [
      { entityId: 'src-0', kind: 'track' },
      { entityId: 'loop-9', kind: 'loop' },
    ]);
  });

  it('expands an unknown folder or playlist to nothing', () => {
    const context = createPlaybackExpansionContext({ playlists, tree });

    assert.deepEqual(context.getFolderChildren('missing'), []);
    assert.deepEqual(context.getPlaylistRefs('missing'), []);
  });
});
