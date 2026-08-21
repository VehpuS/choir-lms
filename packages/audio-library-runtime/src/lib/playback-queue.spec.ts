import assert from 'node:assert/strict';
import { describe, it } from 'node:test';

import {
  createDriveAudioSource,
  type NamedLoop,
  type RehearsalLibraryFileLinkNode,
  type RehearsalLibraryFolderNode,
} from '@org/audio-library-models';

import {
  resolveFolderPlayableItems,
  resolveRehearsalLibraryFolderSubtreeIds,
} from './playback-queue.ts';

const ROOT_FOLDER: RehearsalLibraryFolderNode = {
  id: 'folder:root',
  name: 'Library',
  parentFolderId: null,
  createdAt: '2026-01-01T00:00:00.000Z',
};

const FOLDER_A: RehearsalLibraryFolderNode = {
  id: 'folder:a',
  name: 'Altos',
  parentFolderId: ROOT_FOLDER.id,
  createdAt: '2026-01-01T00:00:00.000Z',
};

const FOLDER_B: RehearsalLibraryFolderNode = {
  id: 'folder:b',
  name: 'Altos / Warmups',
  parentFolderId: FOLDER_A.id,
  createdAt: '2026-01-01T00:00:00.000Z',
};

const FOLDER_C: RehearsalLibraryFolderNode = {
  id: 'folder:c',
  name: 'Sopranos',
  parentFolderId: ROOT_FOLDER.id,
  createdAt: '2026-01-01T00:00:00.000Z',
};

const ALL_FOLDERS = [ROOT_FOLDER, FOLDER_A, FOLDER_B, FOLDER_C];

describe('resolveRehearsalLibraryFolderSubtreeIds', () => {
  it('includes the folder itself and every nested descendant folder', () => {
    const result = resolveRehearsalLibraryFolderSubtreeIds(
      FOLDER_A.id,
      ALL_FOLDERS,
    );

    assert.deepEqual(
      [...result].sort(),
      [FOLDER_A.id, FOLDER_B.id].sort(),
    );
  });

  it('excludes sibling and unrelated folders', () => {
    const result = resolveRehearsalLibraryFolderSubtreeIds(
      FOLDER_A.id,
      ALL_FOLDERS,
    );

    assert.equal(result.has(FOLDER_C.id), false);
    assert.equal(result.has(ROOT_FOLDER.id), false);
  });

  it('returns just the folder itself when it has no children', () => {
    const result = resolveRehearsalLibraryFolderSubtreeIds(
      FOLDER_C.id,
      ALL_FOLDERS,
    );

    assert.deepEqual([...result], [FOLDER_C.id]);
  });
});

describe('resolveFolderPlayableItems', () => {
  const TRACK_IN_A = createDriveAudioSource({
    driveFileId: 'drive:bravo',
    name: 'Bravo Track',
    mimeType: 'audio/mpeg',
    availability: { status: 'available' },
  });
  const LOOP_SOURCE_IN_B = createDriveAudioSource({
    driveFileId: 'drive:alpha-loop-source',
    name: 'Alpha Loop Source',
    mimeType: 'audio/mpeg',
    availability: { status: 'available' },
  });
  const LOOP_IN_B: NamedLoop = {
    id: 'loop:alpha',
    name: 'Alpha Loop',
    sourceId: LOOP_SOURCE_IN_B.id,
    sourceName: LOOP_SOURCE_IN_B.name,
    startMs: 0,
    endMs: 5000,
    ownerId: 'owner:1',
    createdAt: '2026-01-01T00:00:00.000Z',
    updatedAt: '2026-01-01T00:00:00.000Z',
  };
  const UNAVAILABLE_TRACK_IN_A = createDriveAudioSource({
    driveFileId: 'drive:unavailable',
    name: 'Unavailable Track',
    mimeType: 'audio/mpeg',
    availability: { status: 'unsupported', reason: 'unsupported-format' },
  });
  const TRACK_IN_SIBLING_FOLDER = createDriveAudioSource({
    driveFileId: 'drive:sibling',
    name: 'Sibling Track',
    mimeType: 'audio/mpeg',
    availability: { status: 'available' },
  });
  const LOOP_WITH_MISSING_SOURCE: NamedLoop = {
    id: 'loop:missing-source',
    name: 'Missing Source Loop',
    sourceId: 'source:does-not-exist',
    sourceName: 'Ghost Track',
    startMs: 0,
    endMs: 5000,
    ownerId: 'owner:1',
    createdAt: '2026-01-01T00:00:00.000Z',
    updatedAt: '2026-01-01T00:00:00.000Z',
  };

  const FILE_LINKS: RehearsalLibraryFileLinkNode[] = [
    {
      id: 'file-link:track-a',
      parentFolderId: FOLDER_A.id,
      entityKind: 'track',
      entityId: TRACK_IN_A.id,
    },
    {
      id: 'file-link:loop-b',
      parentFolderId: FOLDER_B.id,
      entityKind: 'loop',
      entityId: LOOP_IN_B.id,
    },
    {
      id: 'file-link:playlist-a',
      parentFolderId: FOLDER_A.id,
      entityKind: 'playlist',
      entityId: 'playlist:not-expanded',
    },
    {
      id: 'file-link:unavailable-track-a',
      parentFolderId: FOLDER_A.id,
      entityKind: 'track',
      entityId: UNAVAILABLE_TRACK_IN_A.id,
    },
    {
      id: 'file-link:loop-missing-source-a',
      parentFolderId: FOLDER_A.id,
      entityKind: 'loop',
      entityId: LOOP_WITH_MISSING_SOURCE.id,
    },
    {
      id: 'file-link:track-sibling',
      parentFolderId: FOLDER_C.id,
      entityKind: 'track',
      entityId: TRACK_IN_SIBLING_FOLDER.id,
    },
  ];

  const SOURCES = [
    TRACK_IN_A,
    LOOP_SOURCE_IN_B,
    UNAVAILABLE_TRACK_IN_A,
    TRACK_IN_SIBLING_FOLDER,
  ];
  const LOOPS = [LOOP_IN_B, LOOP_WITH_MISSING_SOURCE];

  it('resolves tracks and loops from the folder and its nested subfolders, ordered by title', () => {
    const result = resolveFolderPlayableItems(
      FOLDER_A,
      ALL_FOLDERS,
      FILE_LINKS,
      LOOPS,
      SOURCES,
    );

    assert.deepEqual(
      result.map((item) => item.title),
      ['Alpha Loop', 'Bravo Track'],
    );
  });

  it('excludes items from sibling folders outside the subtree', () => {
    const result = resolveFolderPlayableItems(
      FOLDER_A,
      ALL_FOLDERS,
      FILE_LINKS,
      LOOPS,
      SOURCES,
    );

    assert.equal(
      result.some((item) => item.title === 'Sibling Track'),
      false,
    );
  });

  it('excludes unavailable sources and loops whose parent source is missing', () => {
    const result = resolveFolderPlayableItems(
      FOLDER_A,
      ALL_FOLDERS,
      FILE_LINKS,
      LOOPS,
      SOURCES,
    );

    assert.equal(
      result.some((item) => item.title === 'Unavailable Track'),
      false,
    );
    assert.equal(
      result.some((item) => item.title === 'Missing Source Loop'),
      false,
    );
  });

  it('does not expand playlist file links found within the folder', () => {
    const result = resolveFolderPlayableItems(
      FOLDER_A,
      ALL_FOLDERS,
      FILE_LINKS,
      LOOPS,
      SOURCES,
    );

    assert.equal(
      result.some((item) => item.id === 'playlist:not-expanded'),
      false,
    );
  });

  it('returns an empty list when the folder subtree has no playable tracks or loops', () => {
    const result = resolveFolderPlayableItems(
      FOLDER_C,
      ALL_FOLDERS,
      [
        {
          id: 'file-link:unavailable-only',
          parentFolderId: FOLDER_C.id,
          entityKind: 'track',
          entityId: UNAVAILABLE_TRACK_IN_A.id,
        },
      ],
      [],
      [UNAVAILABLE_TRACK_IN_A],
    );

    assert.deepEqual(result, []);
  });
});
