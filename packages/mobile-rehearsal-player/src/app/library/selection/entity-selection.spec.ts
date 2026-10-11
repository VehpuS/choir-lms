import assert from 'node:assert/strict';
import { describe, it } from 'node:test';

import { expandSelectionForPlayback } from './playback-expansion';
import {
  createEntityExpansionContext,
  getEntitySelectionKey,
  getValidEntityKeys,
  orderEntitySelection,
  toEntityPlacementItems,
  toEntitySelectionEntry,
} from './entity-selection';

describe('entity selection identity', () => {
  it('keys a row by kind and id so a track and a loop with the same id stay apart', () => {
    assert.equal(getEntitySelectionKey({ id: 'x', kind: 'track' }), 'track:x');
    assert.notEqual(
      getEntitySelectionKey({ id: 'x', kind: 'track' }),
      getEntitySelectionKey({ id: 'x', kind: 'loop' }),
    );
  });

  it('builds a Files-shaped item whose link id is the entity key', () => {
    assert.deepEqual(toEntitySelectionEntry({ id: 'l1', kind: 'loop' }), {
      item: {
        entityId: 'l1',
        entityKind: 'loop',
        fileLinkId: 'loop:l1',
        kind: 'link',
      },
      key: 'loop:l1',
    });
    assert.deepEqual(toEntitySelectionEntry({ id: 'f1', kind: 'folder' }), {
      item: { folderId: 'f1', kind: 'folder' },
      key: 'folder:f1',
    });
  });
});

describe('orderEntitySelection', () => {
  it('follows the displayed rows and keeps filtered-out entities after, in selection order', () => {
    const items = ['c', 'a', 'z', 'b'].map(
      (id) => toEntitySelectionEntry({ id, kind: 'track' }).item,
    );
    const ordered = orderEntitySelection(items, [
      { id: 'a', kind: 'track' },
      { id: 'b', kind: 'track' },
      { id: 'c', kind: 'track' },
    ]);

    assert.deepEqual(
      ordered.map((item) => (item.kind === 'link' ? item.entityId : '')),
      ['a', 'b', 'c', 'z'],
    );
  });
});

describe('createEntityExpansionContext', () => {
  it('expands a selected playlist into its entries in playlist order', () => {
    const context = createEntityExpansionContext([
      {
        id: 'p1',
        items: [
          {
            createdAt: 't',
            id: 'e2',
            kind: 'track',
            sortIndex: 1,
            sourceId: 'b',
          },
          {
            createdAt: 't',
            id: 'e1',
            kind: 'track',
            sortIndex: 0,
            sourceId: 'a',
          },
        ] as never,
      },
    ]);
    const expansion = expandSelectionForPlayback(
      [{ key: 'playlist:p1', kind: 'playlist', playlistId: 'p1' }],
      context,
    );

    assert.deepEqual(
      expansion.refs.map(({ entityId }) => entityId),
      ['a', 'b'],
    );
  });
});

describe('getValidEntityKeys', () => {
  it('lists every existing entity so only vanished ones are pruned', () => {
    assert.deepEqual(
      [
        ...getValidEntityKeys({
          folders: [{ id: 'f' }],
          loops: [{ id: 'l' }],
          playlists: [{ id: 'p' }],
          sources: [{ id: 's' }],
        }),
      ].sort(),
      ['folder:f', 'loop:l', 'playlist:p', 'track:s'],
    );
  });
});

describe('toEntityPlacementItems', () => {
  it('turns entities into link items for the copy planner and resolves folders', () => {
    const folder = {
      createdAt: 't',
      id: 'f',
      name: 'Folder',
      parentFolderId: null,
    };
    const items = toEntityPlacementItems(
      [
        toEntitySelectionEntry({ id: 's', kind: 'track' }).item,
        toEntitySelectionEntry({ id: 'f', kind: 'folder' }).item,
        toEntitySelectionEntry({ id: 'gone', kind: 'folder' }).item,
      ],
      [folder],
    );

    assert.equal(items.length, 2);
    assert.equal(items[0].kind, 'link');
    assert.deepEqual(
      items[0].kind === 'link' ? items[0].fileLink.entityId : null,
      's',
    );
    assert.equal(items[1].kind, 'folder');
  });
});
