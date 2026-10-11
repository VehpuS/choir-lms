import assert from 'node:assert/strict';
import { describe, it } from 'node:test';

import type { RehearsalLibraryFileTree } from '@org/audio-library-models';

import {
  planBulkDeleteFromFolder,
  planBulkRemoveFromLibrary,
} from './files-bulk-node-plans';
import type { FilesSelectionItem } from './files-selection';

const CREATED_AT = '2026-01-01T00:00:00.000Z';
const folder = (id: string, parentFolderId: string | null) => ({
  createdAt: CREATED_AT,
  id,
  name: id,
  parentFolderId,
});
const link = (
  id: string,
  parentFolderId: string,
  entityKind: 'loop' | 'playlist' | 'track',
  entityId: string,
) => ({ entityId, entityKind, id, parentFolderId });

// root ── verses ── alto
//   links: root: a (track a), a2 (track a again), loop1 (loop l1)
//          verses: b (track b)
//          alto:   c (track c), p (playlist p1)
const tree: RehearsalLibraryFileTree = {
  fileLinks: [
    link('a', 'root', 'track', 'a'),
    link('a2', 'verses', 'track', 'a'),
    link('loop1', 'root', 'loop', 'l1'),
    link('b', 'verses', 'track', 'b'),
    link('c', 'alto', 'track', 'c'),
    link('p', 'alto', 'playlist', 'p1'),
  ],
  folders: [
    folder('root', null),
    folder('verses', 'root'),
    folder('alto', 'verses'),
  ],
  rootFolderId: 'root',
  version: 1,
};

const linkItem = (
  fileLinkId: string,
  entityKind: 'loop' | 'playlist' | 'track',
  entityId: string,
): FilesSelectionItem => ({ entityId, entityKind, fileLinkId, kind: 'link' });
const folderItem = (folderId: string): FilesSelectionItem => ({
  folderId,
  kind: 'folder',
});

describe('planBulkDeleteFromFolder', () => {
  it('counts an item once when it loses its last link, however many links go', () => {
    const plan = planBulkDeleteFromFolder(
      [linkItem('a', 'track', 'a'), linkItem('a2', 'track', 'a')],
      tree,
    );

    assert.equal(plan.linkCount, 2);
    assert.equal(plan.lastLinkCount, 1);
    assert.equal(plan.lastLinkTrackCount, 1);
  });

  it('does not count an item that keeps another link', () => {
    const plan = planBulkDeleteFromFolder([linkItem('a', 'track', 'a')], tree);

    assert.equal(plan.lastLinkCount, 0);
  });

  it('takes the links inside a selected folder and its subfolders', () => {
    const plan = planBulkDeleteFromFolder([folderItem('verses')], tree);

    assert.deepEqual([...plan.fileLinkIds].sort(), ['a2', 'b', 'c', 'p']);
    assert.equal(plan.folderCount, 2);
    assert.deepEqual(plan.topFolderIds, ['verses']);
    assert.equal(plan.lastLinkTrackCount, 3 - 1);
    assert.equal(plan.lastLinkPlaylistCount, 1);
  });

  it('treats a folder nested in another selected folder as part of it', () => {
    const plan = planBulkDeleteFromFolder(
      [folderItem('alto'), folderItem('verses'), linkItem('c', 'track', 'c')],
      tree,
    );

    assert.deepEqual(plan.topFolderIds, ['verses']);
    assert.equal(plan.fileLinkIds.filter((id) => id === 'c').length, 1);
  });

  it('never plans the root folder', () => {
    const plan = planBulkDeleteFromFolder([folderItem('root')], tree);

    assert.deepEqual(plan.topFolderIds, []);
    assert.equal(plan.linkCount, 0);
  });
});

describe('planBulkRemoveFromLibrary', () => {
  it('lists each entity once by kind and counts the folders it leaves out', () => {
    const plan = planBulkRemoveFromLibrary([
      linkItem('a', 'track', 'a'),
      linkItem('a2', 'track', 'a'),
      linkItem('loop1', 'loop', 'l1'),
      linkItem('p', 'playlist', 'p1'),
      folderItem('verses'),
    ]);

    assert.deepEqual(plan, {
      excludedFolderCount: 1,
      loopIds: ['l1'],
      playlistIds: ['p1'],
      sourceIds: ['a'],
    });
  });
});
