import assert from 'node:assert/strict';
import { describe, it } from 'node:test';

import {
  createCompositePlayableItem,
  createDriveAudioSource,
  createTrackPlayableItem,
  type CompositeTrack,
} from '@org/audio-library-models';

import { resolveBulkOfflineFiles } from './bulk-offline-files';

const track = (driveFileId: string) =>
  createDriveAudioSource({
    availability: { status: 'available' },
    driveFileId,
    durationMs: 60_000,
    mimeType: 'audio/mpeg',
    name: driveFileId,
  });
const SOPRANO = track('soprano');
const BASS = track('bass');
const COMPOSITE: CompositeTrack = {
  createdAt: '2026-11-09T10:00:00.000Z',
  defaultMix: { levels: {} },
  id: 'composite-1',
  name: 'Ubi caritas',
  presets: [],
  stems: [
    {
      id: 's1',
      mine: false,
      name: 'Soprano',
      offsetMs: 0,
      trackId: SOPRANO.id,
    },
    { id: 's2', mine: false, name: 'Bass', offsetMs: 0, trackId: BASS.id },
  ],
};

describe('resolveBulkOfflineFiles', () => {
  it('expands a composite to its stems files and keeps a track as its own file', () => {
    const files = resolveBulkOfflineFiles(
      [
        createCompositePlayableItem(COMPOSITE),
        createTrackPlayableItem(SOPRANO),
      ],
      { composites: [COMPOSITE], sources: [SOPRANO, BASS] },
    );

    assert.deepEqual(
      files.map((file) => file.driveFileId),
      ['soprano', 'bass', 'soprano'],
    );
  });

  it('leaves out a composite that is no longer saved', () => {
    assert.deepEqual(
      resolveBulkOfflineFiles([createCompositePlayableItem(COMPOSITE)], {
        composites: [],
        sources: [SOPRANO, BASS],
      }),
      [],
    );
  });
});
