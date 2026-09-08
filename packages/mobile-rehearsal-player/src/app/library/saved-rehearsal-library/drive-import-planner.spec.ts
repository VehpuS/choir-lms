import assert from 'node:assert/strict';
import { describe, it } from 'node:test';

import type {
  DriveAudioDiscoveryResult,
  DriveEnumeratedAudioSource,
  DriveFolderContents,
} from '@org/google-drive';

import {
  createAudio,
  createDescendantFolder,
  createFolder,
  createLibraryState,
  createSelection,
  createUnsupportedAudio,
  DESTINATION_FOLDER_ID,
} from './drive-import-planner-test-fixtures.js';
import { createDriveImportPlan } from './drive-import-planner.js';

describe('createDriveImportPlan', () => {
  it('flattens multiple roots and individual audio into one destination', () => {
    const warmups = createFolder('folder-warmups', 'Warmups');
    const repertoire = createFolder('folder-repertoire', 'Repertoire');
    const looseAudio = createAudio(
      'audio-loose',
      'Breathing.mp3',
    ) as DriveAudioDiscoveryResult;
    const sharedAudio = createAudio(
      'audio-shared',
      'Shared.mp3',
      warmups.id,
    ) as DriveEnumeratedAudioSource;
    const unsupported = createUnsupportedAudio(
      'audio-unsupported',
      repertoire.id,
    );
    const contentsByFolderId = new Map<string, DriveFolderContents>([
      [
        warmups.id,
        {
          folders: [
            createDescendantFolder('folder-technique', 'Technique', warmups.id),
          ],
          playableSources: [sharedAudio],
          unavailableSources: [],
        },
      ],
      [
        repertoire.id,
        {
          folders: [],
          playableSources: [
            createAudio(
              'audio-anthem',
              'Nonmatching Anthem.mp3',
              repertoire.id,
            ) as DriveEnumeratedAudioSource,
            { ...sharedAudio, parentFolderId: repertoire.id },
          ],
          unavailableSources: [unsupported, unsupported],
        },
      ],
    ]);

    const plan = createDriveImportPlan({
      contentsByFolderId,
      destinationFolderId: DESTINATION_FOLDER_ID,
      libraryState: createLibraryState(),
      mode: 'flatten',
      selection: createSelection({
        audio: [looseAudio],
        folders: [warmups, repertoire],
      }),
    });

    assert.deepEqual(plan.folders, []);
    assert.deepEqual(
      plan.tracks.map(({ source, targetFolder }) => ({
        driveFileId: source.driveFileId,
        targetFolder,
      })),
      [
        {
          driveFileId: 'audio-loose',
          targetFolder: {
            folderId: DESTINATION_FOLDER_ID,
            kind: 'library-folder',
          },
        },
        {
          driveFileId: 'audio-anthem',
          targetFolder: {
            folderId: DESTINATION_FOLDER_ID,
            kind: 'library-folder',
          },
        },
        {
          driveFileId: 'audio-shared',
          targetFolder: {
            folderId: DESTINATION_FOLDER_ID,
            kind: 'library-folder',
          },
        },
      ],
    );
    assert.deepEqual(plan.unsupportedSources, [unsupported]);
    assert.deepEqual(plan.summary, {
      alreadyPresentTracks: 0,
      foldersToCreate: 0,
      newTracks: 3,
      reusableTracks: 0,
      tracksToImport: 3,
      unsupportedFiles: 1,
    });
  });

  it('preserves each selected root and descendant hierarchy', () => {
    const warmups = createFolder('folder-warmups', 'Warmups');
    const repertoire = createFolder('folder-repertoire', 'Repertoire');
    const looseAudio = createAudio(
      'audio-loose',
      'Breathing.mp3',
    ) as DriveAudioDiscoveryResult;
    const technique = createDescendantFolder(
      'folder-technique',
      'Technique',
      warmups.id,
    );
    const breathing = createDescendantFolder(
      'folder-breathing',
      'Breathing',
      technique.id,
    );
    const contentsByFolderId = new Map<string, DriveFolderContents>([
      [
        warmups.id,
        {
          folders: [breathing, technique],
          playableSources: [
            createAudio(
              'audio-deep',
              'Deep.mp3',
              breathing.id,
            ) as DriveEnumeratedAudioSource,
          ],
          unavailableSources: [],
        },
      ],
      [
        repertoire.id,
        {
          folders: [],
          playableSources: [
            createAudio(
              'audio-repertoire',
              'Piece.mp3',
              repertoire.id,
            ) as DriveEnumeratedAudioSource,
          ],
          unavailableSources: [],
        },
      ],
    ]);

    const plan = createDriveImportPlan({
      contentsByFolderId,
      destinationFolderId: DESTINATION_FOLDER_ID,
      libraryState: createLibraryState(),
      mode: 'preserve-structure',
      selection: createSelection({
        audio: [looseAudio],
        folders: [warmups, repertoire],
      }),
    });

    assert.deepEqual(
      plan.folders.map(({ folder, parent }) => ({
        driveFolderId: folder.id,
        parent,
      })),
      [
        {
          driveFolderId: repertoire.id,
          parent: {
            folderId: DESTINATION_FOLDER_ID,
            kind: 'library-folder',
          },
        },
        {
          driveFolderId: warmups.id,
          parent: {
            folderId: DESTINATION_FOLDER_ID,
            kind: 'library-folder',
          },
        },
        {
          driveFolderId: technique.id,
          parent: {
            driveFolderId: warmups.id,
            kind: 'planned-folder',
          },
        },
        {
          driveFolderId: breathing.id,
          parent: {
            driveFolderId: technique.id,
            kind: 'planned-folder',
          },
        },
      ],
    );
    assert.deepEqual(
      plan.tracks.map(({ source, targetFolder }) => ({
        driveFileId: source.driveFileId,
        targetFolder,
      })),
      [
        {
          driveFileId: 'audio-loose',
          targetFolder: {
            folderId: DESTINATION_FOLDER_ID,
            kind: 'library-folder',
          },
        },
        {
          driveFileId: 'audio-repertoire',
          targetFolder: {
            driveFolderId: repertoire.id,
            kind: 'planned-folder',
          },
        },
        {
          driveFileId: 'audio-deep',
          targetFolder: {
            driveFolderId: breathing.id,
            kind: 'planned-folder',
          },
        },
      ],
    );
    assert.deepEqual(plan.summary, {
      alreadyPresentTracks: 0,
      foldersToCreate: 4,
      newTracks: 3,
      reusableTracks: 0,
      tracksToImport: 3,
      unsupportedFiles: 0,
    });
  });

  it('rejects a selected folder without complete enumeration', () => {
    const missingFolder = createFolder('folder-missing', 'Missing');

    assert.throws(
      () =>
        createDriveImportPlan({
          contentsByFolderId: new Map(),
          destinationFolderId: DESTINATION_FOLDER_ID,
          libraryState: createLibraryState(),
          mode: 'flatten',
          selection: createSelection({ folders: [missingFolder] }),
        }),
      /folder-missing is missing complete import contents/,
    );
  });
});
