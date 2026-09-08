import assert from 'node:assert/strict';
import { describe, it } from 'node:test';

import { createDriveAudioSource } from '@org/audio-library-models';
import type {
  DriveAudioDiscoveryResult,
  DriveFolderDiscoveryResult,
  DrivePathSegment,
} from '@org/google-drive';

import { normalizeDriveImportSelection } from './drive-import-selection-normalizer.js';

const createFolder = (
  id: string,
  name: string,
  path: DrivePathSegment[] = [],
): DriveFolderDiscoveryResult => ({
  id,
  kind: 'folder',
  name,
  path,
  rootKind: 'my-drive',
  shared: false,
});

const createAudio = (
  driveFileId: string,
  name: string,
  path: DrivePathSegment[] = [],
): DriveAudioDiscoveryResult => ({
  ...createDriveAudioSource({
    availability: { status: 'available' },
    driveFileId,
    mimeType: 'audio/mpeg',
    name,
  }),
  kind: 'audio',
  path,
});

describe('normalizeDriveImportSelection', () => {
  it('preserves independent mixed selections in first-selected order', () => {
    const rootFolder = createFolder('folder-root', 'Warmups');
    const siblingFolder = createFolder('folder-sibling', 'Concert');
    const looseAudio = createAudio('audio-loose', 'Breathing.mp3');

    const normalized = normalizeDriveImportSelection([
      rootFolder,
      looseAudio,
      siblingFolder,
    ]);

    assert.deepEqual(normalized.folders, [rootFolder, siblingFolder]);
    assert.deepEqual(normalized.audio, [looseAudio]);
    assert.deepEqual(normalized.overlapCounts, {
      coveredAudio: 0,
      duplicateSelections: 0,
      nestedFolders: 0,
      total: 0,
    });
  });

  it('keeps only the highest selected folder and removes covered audio', () => {
    const rootFolder = createFolder('folder-root', 'Choir');
    const sectionFolder = createFolder('folder-section', 'Altos', [
      { id: rootFolder.id, name: rootFolder.name },
    ]);
    const rehearsalFolder = createFolder('folder-rehearsal', 'Week 1', [
      { id: rootFolder.id, name: rootFolder.name },
      { id: sectionFolder.id, name: sectionFolder.name },
    ]);
    const coveredAudio = createAudio('audio-covered', 'Part.mp3', [
      { id: rootFolder.id, name: rootFolder.name },
      { id: sectionFolder.id, name: sectionFolder.name },
      { id: rehearsalFolder.id, name: rehearsalFolder.name },
    ]);
    const looseAudio = createAudio('audio-loose', 'Notes.mp3');

    const normalized = normalizeDriveImportSelection([
      rehearsalFolder,
      coveredAudio,
      sectionFolder,
      rootFolder,
      looseAudio,
    ]);

    assert.deepEqual(normalized.folders, [rootFolder]);
    assert.deepEqual(normalized.audio, [looseAudio]);
    assert.deepEqual(normalized.overlapCounts, {
      coveredAudio: 1,
      duplicateSelections: 0,
      nestedFolders: 2,
      total: 3,
    });
  });

  it('deduplicates Drive identities before calculating descendant overlaps', () => {
    const rootFolder = createFolder('folder-root', 'Choir');
    const nestedFolder = createFolder('folder-nested', 'Tenors', [
      { id: rootFolder.id, name: rootFolder.name },
    ]);
    const coveredAudio = createAudio('audio-covered', 'Tenor.mp3', [
      { id: rootFolder.id, name: rootFolder.name },
      { id: nestedFolder.id, name: nestedFolder.name },
    ]);
    const looseAudio = createAudio('audio-loose', 'Guide.mp3');

    const normalized = normalizeDriveImportSelection([
      rootFolder,
      nestedFolder,
      nestedFolder,
      coveredAudio,
      coveredAudio,
      looseAudio,
      looseAudio,
    ]);

    assert.deepEqual(normalized.folders, [rootFolder]);
    assert.deepEqual(normalized.audio, [looseAudio]);
    assert.deepEqual(normalized.overlapCounts, {
      coveredAudio: 1,
      duplicateSelections: 3,
      nestedFolders: 1,
      total: 5,
    });
  });
});
