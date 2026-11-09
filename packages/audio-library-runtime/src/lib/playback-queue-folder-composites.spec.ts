import assert from 'node:assert/strict';
import { describe, it } from 'node:test';

import {
  createDriveAudioSource,
  type CompositeTrack,
  type DriveAudioSource,
  type RehearsalLibraryFileLinkNode,
  type RehearsalLibraryFolderNode,
} from '@org/audio-library-models';

import { resolveFolderPlayableItems } from './playback-queue.ts';

const FOLDER: RehearsalLibraryFolderNode = {
  id: 'folder:a',
  name: 'A',
  parentFolderId: null,
  createdAt: '2026-11-09T00:00:00.000Z',
};
const track = (driveFileId: string): DriveAudioSource => ({
  ...createDriveAudioSource({
    driveFileId,
    name: driveFileId,
    mimeType: 'audio/mpeg',
    availability: { status: 'available' },
  } as Parameters<typeof createDriveAudioSource>[0]),
  durationMs: 90_000,
});
const alto = track('alto');
const bass = track('bass');
const composite: CompositeTrack = {
  id: 'c1',
  name: 'Ubi caritas',
  createdAt: '2026-11-09T00:00:00.000Z',
  stems: [
    { id: 's1', trackId: alto.id, name: 'Alto', offsetMs: 0, mine: false },
    { id: 's2', trackId: bass.id, name: 'Bass', offsetMs: 0, mine: false },
  ],
  defaultMix: { levels: {} },
  presets: [],
};
const link = (entityKind: 'track' | 'composite', entityId: string) =>
  ({
    id: `link:${entityId}`,
    parentFolderId: FOLDER.id,
    entityKind,
    entityId,
  }) as RehearsalLibraryFileLinkNode;

describe('resolveFolderPlayableItems with composites', () => {
  it('plays a composite in a folder as one item beside its stems', () => {
    const items = resolveFolderPlayableItems(
      FOLDER,
      [FOLDER],
      [link('track', alto.id), link('composite', composite.id)],
      [],
      [alto, bass],
      [composite],
    );

    assert.deepEqual(
      items.map(({ kind, title }) => [kind, title]),
      [
        ['track', alto.name],
        ['composite', 'Ubi caritas'],
      ],
    );
  });

  it('skips a composite that is gone or has no stem left', () => {
    const items = resolveFolderPlayableItems(
      FOLDER,
      [FOLDER],
      [link('composite', composite.id), link('composite', 'missing')],
      [],
      [],
      [composite],
    );

    assert.deepEqual(items, []);
  });
});
