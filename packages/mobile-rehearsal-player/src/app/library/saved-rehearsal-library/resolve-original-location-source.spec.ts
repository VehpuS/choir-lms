import assert from 'node:assert/strict';
import { describe, it } from 'node:test';

import {
  createAdjustedTrackSource,
  createDriveAudioSource,
} from '@org/audio-library-models';

import { resolveOriginalLocationSource } from './resolve-original-location-source';

const source = createDriveAudioSource({
  availability: { status: 'available' },
  driveFileId: 'drive-track',
  mimeType: 'audio/mpeg',
  name: 'Warmup.mp3',
  sourceLocation: {
    parentFolderId: 'folder-alto',
    parentFolderName: 'Alto',
    rootKind: 'my-drive',
    path: [{ id: 'folder-alto', name: 'Alto' }],
  },
});
const adjusted = createAdjustedTrackSource({
  source,
  transform: {
    pitchSemitones: 0,
    speedMultiplier: 0.8,
    tempoSource: 'multiplier',
  },
});

describe('resolveOriginalLocationSource', () => {
  it('answers with the source track for an adjusted track, so provenance is never saved onto the adjusted one', () => {
    assert.equal(
      resolveOriginalLocationSource(adjusted, [source, adjusted]),
      source,
    );
  });

  it('answers with the source itself when it is not adjusted', () => {
    assert.equal(
      resolveOriginalLocationSource(source, [source, adjusted]),
      source,
    );
  });

  it('falls back to the adjusted track when its source track is not saved', () => {
    assert.equal(resolveOriginalLocationSource(adjusted, [adjusted]), adjusted);
  });
});
