import assert from 'node:assert/strict';
import { describe, it } from 'node:test';

import { createDriveAudioSource } from '@org/audio-library-models';

import {
  REHEARSAL_LIBRARY_ROOT_FOLDER_ID,
  syncRehearsalLibraryFileTree,
} from './rehearsal-library-files';
import {
  buildPlacementNodes,
  planRehearsalLibraryPlacement,
  type PlacementItem,
} from './rehearsal-library-placement-plan';

const source = (name: string) =>
  createDriveAudioSource({
    availability: { status: 'available' },
    driveFileId: `drive-${name}`,
    durationMs: 1000,
    mimeType: 'audio/mpeg',
    name,
  });
const verse = source('Verse.mp3');
const chorus = source('Chorus.mp3');
const otherVerse = { ...source('Other.mp3'), name: 'verse.mp3' };
const entityCollections = {
  loops: [],
  playlists: [],
  sources: [verse, chorus, otherVerse],
};
const rootTree = syncRehearsalLibraryFileTree({ entityCollections });
const folder = (id: string, name: string, parentFolderId: string) => ({
  createdAt: '2026-05-10T10:00:00.000Z',
  id,
  name,
  parentFolderId,
});
const tree = {
  ...rootTree,
  folders: [
    ...rootTree.folders,
    folder('dest', 'Dest', REHEARSAL_LIBRARY_ROOT_FOLDER_ID),
    folder('parent', 'Parent', REHEARSAL_LIBRARY_ROOT_FOLDER_ID),
    folder('child', 'Child', 'parent'),
  ],
};
const linkItem = (entityId: string): PlacementItem => {
  const fileLink = tree.fileLinks.find((link) => link.entityId === entityId);

  assert.ok(fileLink);
  return { fileLink, kind: 'link' };
};
const folderItem = (id: string): PlacementItem => {
  const found = tree.folders.find((candidate) => candidate.id === id);

  assert.ok(found);
  return { folder: found, kind: 'folder' };
};
const plan = (
  items: PlacementItem[],
  mode: 'copy' | 'move',
  destinationFolderId = 'dest',
  planTree = tree,
) =>
  planRehearsalLibraryPlacement({
    destinationFolderId,
    entityCollections,
    items,
    mode,
    tree: planTree,
  });

describe('planRehearsalLibraryPlacement', () => {
  it('marks items with free names ready', () => {
    const entries = plan([linkItem(verse.id), linkItem(chorus.id)], 'move');

    assert.deepEqual(
      entries.map(({ status }) => status),
      ['ready', 'ready'],
    );
  });

  it('finds a conflict with an existing child, case-insensitively, with a Copy proposal', () => {
    const withExisting = {
      ...tree,
      fileLinks: tree.fileLinks.map((link) =>
        link.entityId === otherVerse.id
          ? { ...link, parentFolderId: 'dest' }
          : link,
      ),
    };
    const [entry] = plan([linkItem(verse.id)], 'copy', 'dest', withExisting);

    assert.equal(entry?.status, 'conflict');
    assert.equal(entry?.suggestedName, 'Verse.mp3 Copy');
  });

  it('finds a conflict between two items of the same batch and proposes distinct names', () => {
    const entries = plan([linkItem(verse.id), linkItem(otherVerse.id)], 'copy');

    assert.deepEqual(
      entries.map(({ status }) => status),
      ['ready', 'conflict'],
    );
  });

  it('keeps an item that is already in the destination ready when moved there', () => {
    const [entry] = plan(
      [linkItem(verse.id)],
      'move',
      REHEARSAL_LIBRARY_ROOT_FOLDER_ID,
    );

    assert.equal(entry?.status, 'ready');
  });

  it('rejects moving a folder into itself or a descendant, in one pass', () => {
    const entries = plan(
      [folderItem('parent'), folderItem('child')],
      'move',
      'child',
    );

    assert.deepEqual(
      entries.map(({ invalidReason }) => invalidReason),
      ['folder-into-itself', 'folder-into-itself'],
    );
  });

  it('rejects folders for copy', () => {
    const [entry] = plan([folderItem('child')], 'copy');

    assert.equal(entry?.invalidReason, 'folder-copy-unsupported');
  });
});

describe('buildPlacementNodes', () => {
  const createLinkId = (link: { id: string }) => `${link.id}:copy`;

  it('places ready items, and copies get new link ids', () => {
    const entries = plan([linkItem(verse.id)], 'copy');
    const { fileLinks, skippedCount } = buildPlacementNodes({
      createLinkId,
      destinationFolderId: 'dest',
      mode: 'copy',
      plan: entries,
      resolutions: {},
    });

    assert.equal(skippedCount, 0);
    assert.match(fileLinks[0]?.id ?? '', /:copy$/);
    assert.equal(fileLinks[0]?.parentFolderId, 'dest');
    assert.equal(fileLinks[0]?.visibleName, undefined);
  });

  it('applies keep-both as the proposed name and skips unresolved conflicts', () => {
    const entries = plan([linkItem(verse.id), linkItem(otherVerse.id)], 'copy');
    const conflictId = entries[1]?.itemId ?? '';
    const kept = buildPlacementNodes({
      createLinkId,
      destinationFolderId: 'dest',
      mode: 'copy',
      plan: entries,
      resolutions: { [conflictId]: 'keep-both' },
    });
    const skipped = buildPlacementNodes({
      createLinkId,
      destinationFolderId: 'dest',
      mode: 'copy',
      plan: entries,
      resolutions: {},
    });

    assert.equal(kept.fileLinks[1]?.visibleName, 'verse.mp3 Copy');
    assert.equal(skipped.fileLinks.length, 1);
    assert.equal(skipped.skippedCount, 1);
  });

  it('never places invalid entries', () => {
    const entries = plan([folderItem('parent')], 'move', 'child');
    const result = buildPlacementNodes({
      createLinkId,
      destinationFolderId: 'child',
      mode: 'move',
      plan: entries,
      resolutions: {},
    });

    assert.deepEqual(result.folders, []);
    assert.equal(result.skippedCount, 1);
  });
});
