import assert from 'node:assert/strict';
import { describe, it } from 'node:test';

import {
  createDriveAudioSource,
  type RehearsalLibraryFileTree,
} from '@org/audio-library-models';

import { expandSelectionForPlayback } from '../selection/playback-expansion';
import {
  createFilesPlaybackExpansionContext,
  getFilesRowSelectionState,
  getKeysSubsumedByFolder,
  orderFilesSelectionByRows,
  toFilesBulkSelectionItem,
  toFilesSelectionEntry,
  toFilesTagTargets,
  toPlacementItems,
  type FilesSelectionItem,
} from './files-selection';
import type { LibraryFilesRow } from './library-files-model';

const CREATED_AT = '2026-01-01T00:00:00.000Z';

const folder = (id: string, parentFolderId: string | null, name = id) => ({
  createdAt: CREATED_AT,
  id,
  name,
  parentFolderId,
});
const link = (
  id: string,
  parentFolderId: string,
  entityKind: 'loop' | 'playlist' | 'track',
  entityId: string,
) => ({ entityId, entityKind, id, parentFolderId });

// root
// ├─ Verses/            (folder)
// │   └─ Alto/          (folder)
// │       └─ link-alto  (track alto)
// ├─ link-a             (track a)
// └─ link-b             (track b)
const tree: RehearsalLibraryFileTree = {
  fileLinks: [
    link('link-alto', 'alto', 'track', 'alto'),
    link('link-a', 'root', 'track', 'a'),
    link('link-b', 'root', 'track', 'b'),
  ],
  folders: [
    folder('root', null),
    folder('verses', 'root', 'Verses'),
    folder('alto', 'verses', 'Alto'),
  ],
  rootFolderId: 'root',
  version: 1,
};

const linkItem = (
  fileLinkId: string,
  entityId: string,
): FilesSelectionItem => ({
  entityId,
  entityKind: 'track',
  fileLinkId,
  kind: 'link',
});
const folderItem = (folderId: string): FilesSelectionItem => ({
  folderId,
  kind: 'folder',
});

const trackRow = (fileLinkId: string, entityId: string) =>
  ({
    fileLink: link(fileLinkId, 'root', 'track', entityId),
    kind: 'track',
  }) as unknown as LibraryFilesRow;
const folderRow = (folderId: string) =>
  ({
    folder: folder(folderId, 'root'),
    kind: 'folder',
  }) as unknown as LibraryFilesRow;

describe('files selection identity', () => {
  it('keys a link row by its link id and a folder row by its folder id', () => {
    assert.deepEqual(toFilesSelectionEntry(trackRow('link-a', 'a')), {
      item: linkItem('link-a', 'a'),
      key: 'link-a',
    });
    assert.deepEqual(toFilesSelectionEntry(folderRow('verses')), {
      item: folderItem('verses'),
      key: 'verses',
    });
  });

  it('reduces nodes to the bulk items the playback rules read', () => {
    assert.deepEqual(toFilesBulkSelectionItem(folderItem('verses')), {
      folderId: 'verses',
      key: 'verses',
      kind: 'folder',
    });
    assert.deepEqual(toFilesBulkSelectionItem(linkItem('link-a', 'a')), {
      entityId: 'a',
      key: 'link-a',
      kind: 'track',
    });
    assert.deepEqual(
      toFilesBulkSelectionItem({
        entityId: 'p1',
        entityKind: 'playlist',
        fileLinkId: 'link-p',
        kind: 'link',
      }),
      { key: 'link-p', kind: 'playlist', playlistId: 'p1' },
    );
  });
});

describe('orderFilesSelectionByRows', () => {
  it('orders visible nodes top to bottom and keeps hidden ones after, in selection order', () => {
    const ordered = orderFilesSelectionByRows(
      [
        linkItem('link-b', 'b'),
        linkItem('link-alto', 'alto'),
        linkItem('link-a', 'a'),
        folderItem('verses'),
      ],
      [folderRow('verses'), trackRow('link-a', 'a'), trackRow('link-b', 'b')],
    );

    assert.deepEqual(
      ordered.map((item) =>
        item.kind === 'folder' ? item.folderId : item.fileLinkId,
      ),
      ['verses', 'link-a', 'link-b', 'link-alto'],
    );
  });
});

describe('getFilesRowSelectionState', () => {
  it('marks a folder partial when something beneath it is selected', () => {
    const state = getFilesRowSelectionState({
      items: [linkItem('link-alto', 'alto')],
      rows: [folderRow('verses'), trackRow('link-a', 'a')],
      tree,
    });

    assert.deepEqual([...state.partialKeys], ['verses']);
    assert.equal(state.coveredKeys.size, 0);
  });

  it('does not mark a selected folder partial, and covers the rows inside it', () => {
    const state = getFilesRowSelectionState({
      items: [folderItem('verses'), linkItem('link-alto', 'alto')],
      rows: [folderRow('alto'), trackRow('link-alto', 'alto')],
      tree,
    });

    assert.equal(state.partialKeys.size, 0);
    assert.deepEqual([...state.coveredKeys].sort(), ['alto', 'link-alto']);
  });

  it('leaves unrelated rows alone', () => {
    const state = getFilesRowSelectionState({
      items: [linkItem('link-a', 'a')],
      rows: [folderRow('verses'), trackRow('link-b', 'b')],
      tree,
    });

    assert.equal(state.partialKeys.size, 0);
    assert.equal(state.coveredKeys.size, 0);
  });
});

describe('getKeysSubsumedByFolder', () => {
  it('lists the selected nodes beneath a folder so selecting it replaces them', () => {
    assert.deepEqual(
      getKeysSubsumedByFolder({
        folderId: 'verses',
        items: [
          linkItem('link-alto', 'alto'),
          folderItem('alto'),
          linkItem('link-a', 'a'),
        ],
        tree,
      }).sort(),
      ['alto', 'link-alto'],
    );
  });
});

describe('createFilesPlaybackExpansionContext', () => {
  it('lists a folder depth first in the Files view order, folders before tracks', () => {
    const [alto, alpha, beta] = ['Alto', 'Alpha', 'Beta'].map((name) =>
      createDriveAudioSource({
        availability: { status: 'available' },
        driveFileId: `drive-${name}`,
        mimeType: 'audio/mpeg',
        name: `${name}.mp3`,
      }),
    );
    const sourceTree: RehearsalLibraryFileTree = {
      ...tree,
      fileLinks: [
        link('link-alto', 'alto', 'track', alto.id),
        link('link-a', 'root', 'track', alpha.id),
        link('link-b', 'root', 'track', beta.id),
      ],
    };
    const context = createFilesPlaybackExpansionContext({
      savedLoops: [],
      savedPlaylists: [],
      savedSources: [alto, alpha, beta],
      tree: sourceTree,
    });
    const expansion = expandSelectionForPlayback(
      [{ folderId: 'root', key: 'root', kind: 'folder' }],
      context,
    );

    assert.deepEqual(
      expansion.refs.map(({ entityId }) => entityId),
      [alto.id, alpha.id, beta.id],
    );
  });
});

describe('toPlacementItems', () => {
  it('resolves nodes against the current tree and counts the ones that vanished', () => {
    const { missingCount, placementItems } = toPlacementItems(
      [folderItem('verses'), linkItem('link-a', 'a'), linkItem('gone', 'x')],
      tree,
    );

    assert.equal(missingCount, 1);
    assert.deepEqual(
      placementItems.map((item) =>
        item.kind === 'folder' ? item.folder.id : item.fileLink.id,
      ),
      ['verses', 'link-a'],
    );
  });
});

describe('toFilesTagTargets', () => {
  it('lists each entity once, even when it is selected through two links', () => {
    assert.deepEqual(
      toFilesTagTargets([
        folderItem('verses'),
        linkItem('link-a', 'a'),
        linkItem('link-a-again', 'a'),
        {
          entityId: 'p1',
          entityKind: 'playlist',
          fileLinkId: 'link-p',
          kind: 'link',
        },
      ]),
      [
        { id: 'verses', kind: 'folder' },
        { id: 'a', kind: 'track' },
        { id: 'p1', kind: 'playlist' },
      ],
    );
  });
});
