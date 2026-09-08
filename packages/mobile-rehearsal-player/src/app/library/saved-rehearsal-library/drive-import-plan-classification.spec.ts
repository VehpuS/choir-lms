import assert from 'node:assert/strict';
import { describe, it } from 'node:test';

import type {
  DriveAudioDiscoveryResult,
  DriveEnumeratedAudioSource,
  DriveFolderContents,
} from '@org/google-drive';

import { createDriveImportLibraryFolderId } from './drive-import-plan-classification.js';
import {
  createAudio,
  createFolder,
  createLibraryState,
  createSelection,
  DESTINATION_FOLDER_ID,
} from './drive-import-planner-test-fixtures.js';
import { createDriveImportPlan } from './drive-import-planner.js';

const asDiscoveryAudio = (
  source: ReturnType<typeof createAudio>,
): DriveAudioDiscoveryResult => source as DriveAudioDiscoveryResult;

const asEnumeratedAudio = (
  source: ReturnType<typeof createAudio>,
): DriveEnumeratedAudioSource => source as DriveEnumeratedAudioSource;

describe('createDriveImportPlan classification', () => {
  it('allocates case-insensitive keep-both names in Drive path and id order', () => {
    const folderB = createFolder('folder-b', 'Warmups');
    const folderA = createFolder('folder-a', 'Warmups');
    const audioB = asDiscoveryAudio(createAudio('audio-b', 'Song.mp3'));
    const audioA = asDiscoveryAudio(createAudio('audio-a', 'Song.mp3'));
    const plan = createDriveImportPlan({
      contentsByFolderId: new Map([
        [
          folderA.id,
          { folders: [], playableSources: [], unavailableSources: [] },
        ],
        [
          folderB.id,
          { folders: [], playableSources: [], unavailableSources: [] },
        ],
      ]),
      destinationFolderId: DESTINATION_FOLDER_ID,
      libraryState: createLibraryState({
        fileLinks: [
          {
            entityId: 'existing-track',
            entityKind: 'track',
            id: 'existing-track-link',
            parentFolderId: DESTINATION_FOLDER_ID,
            visibleName: 'song.mp3 copy',
          },
          {
            entityId: 'existing-folder-name',
            entityKind: 'track',
            id: 'existing-folder-name-link',
            parentFolderId: DESTINATION_FOLDER_ID,
            visibleName: 'Warmups Copy',
          },
        ],
        folders: [
          {
            createdAt: '2026-09-08T00:00:00.000Z',
            id: DESTINATION_FOLDER_ID,
            name: 'Destination',
            parentFolderId: null,
          },
          {
            createdAt: '2026-09-08T00:00:00.000Z',
            id: 'existing-warmups',
            name: 'WARMUPS',
            parentFolderId: DESTINATION_FOLDER_ID,
          },
          {
            createdAt: '2026-09-08T00:00:00.000Z',
            id: 'existing-song',
            name: 'SONG.MP3',
            parentFolderId: DESTINATION_FOLDER_ID,
          },
        ],
      }),
      mode: 'preserve-structure',
      selection: createSelection({
        audio: [audioB, audioA],
        folders: [folderB, folderA],
      }),
    });

    assert.deepEqual(
      plan.folders.map(({ folder, name }) => [folder.id, name]),
      [
        ['folder-a', 'Warmups Copy 2'],
        ['folder-b', 'Warmups Copy 3'],
      ],
    );
    assert.deepEqual(
      plan.tracks.map(({ source, visibleName }) => [
        source.driveFileId,
        visibleName,
      ]),
      [
        ['audio-a', 'Song.mp3 Copy 2'],
        ['audio-b', 'Song.mp3 Copy 3'],
      ],
    );
  });

  it('reuses partial folders and classifies sources against current state', () => {
    const rootFolder = createFolder('folder-root', 'Warmups');
    const existingFolderId = createDriveImportLibraryFolderId(
      rootFolder.id,
      DESTINATION_FOLDER_ID,
    );
    const alreadySource = asEnumeratedAudio(
      createAudio('audio-already', 'Already.mp3', rootFolder.id),
    );
    const newSource = asEnumeratedAudio(
      createAudio('audio-new', 'New.mp3', rootFolder.id),
    );
    const reusableSource = asEnumeratedAudio(
      createAudio('audio-reusable', 'Reusable.mp3', rootFolder.id),
    );
    const contents: DriveFolderContents = {
      folders: [],
      playableSources: [reusableSource, newSource, alreadySource],
      unavailableSources: [],
    };
    const plan = createDriveImportPlan({
      contentsByFolderId: new Map([[rootFolder.id, contents]]),
      destinationFolderId: DESTINATION_FOLDER_ID,
      libraryState: createLibraryState({
        fileLinks: [
          {
            entityId: alreadySource.id,
            entityKind: 'track',
            id: 'completed-link',
            parentFolderId: existingFolderId,
          },
        ],
        folders: [
          {
            createdAt: '2026-09-08T00:00:00.000Z',
            id: DESTINATION_FOLDER_ID,
            name: 'Destination',
            parentFolderId: null,
          },
          {
            createdAt: '2026-09-08T00:00:00.000Z',
            id: 'existing-warmups',
            name: 'warmups',
            parentFolderId: DESTINATION_FOLDER_ID,
          },
          {
            createdAt: '2026-09-08T00:00:00.000Z',
            id: existingFolderId,
            name: 'Warmups Copy',
            parentFolderId: DESTINATION_FOLDER_ID,
          },
        ],
        sources: [alreadySource, reusableSource],
      }),
      mode: 'preserve-structure',
      selection: createSelection({ folders: [rootFolder] }),
    });

    assert.deepEqual(
      plan.folders.map(({ libraryFolderId, name, status }) => ({
        libraryFolderId,
        name,
        status,
      })),
      [
        {
          libraryFolderId: existingFolderId,
          name: 'Warmups Copy',
          status: 'reuse',
        },
      ],
    );
    assert.deepEqual(
      plan.tracks.map(
        ({ canonicalSourceId, classification, libraryFileLinkId, source }) => ({
          canonicalSourceId,
          classification,
          driveFileId: source.driveFileId,
          libraryFileLinkId,
        }),
      ),
      [
        {
          canonicalSourceId: alreadySource.id,
          classification: 'already-present',
          driveFileId: alreadySource.driveFileId,
          libraryFileLinkId: 'completed-link',
        },
        {
          canonicalSourceId: newSource.id,
          classification: 'new',
          driveFileId: newSource.driveFileId,
          libraryFileLinkId: `file-link:drive-import:audio-new:${encodeURIComponent(existingFolderId)}`,
        },
        {
          canonicalSourceId: reusableSource.id,
          classification: 'reusable',
          driveFileId: reusableSource.driveFileId,
          libraryFileLinkId: `file-link:drive-import:audio-reusable:${encodeURIComponent(existingFolderId)}`,
        },
      ],
    );
    assert.deepEqual(plan.summary, {
      alreadyPresentTracks: 1,
      foldersToCreate: 0,
      newTracks: 1,
      reusableTracks: 1,
      tracksToImport: 3,
      unsupportedFiles: 0,
    });
  });
});
