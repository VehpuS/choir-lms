import {
  createDriveAudioSource,
  type DriveAudioSource,
  type RehearsalLibraryFileLinkNode,
  type RehearsalLibraryFolderNode,
} from '@org/audio-library-models';
import type {
  DriveAudioDiscoveryResult,
  DriveEnumeratedAudioSource,
  DriveEnumeratedFolder,
  DriveFolderDiscoveryResult,
} from '@org/google-drive';

import type { DriveImportLibraryState } from './drive-import-plan-classification';
import type { NormalizedDriveImportSelection } from './drive-import-selection-normalizer';

export const DESTINATION_FOLDER_ID = 'library-destination';

export const createLibraryState = (options?: {
  fileLinks?: RehearsalLibraryFileLinkNode[];
  folders?: RehearsalLibraryFolderNode[];
  sources?: DriveAudioSource[];
}): DriveImportLibraryState => ({
  entityCollections: {
    loops: [],
    playlists: [],
    sources: options?.sources ?? [],
  },
  tree: {
    fileLinks: options?.fileLinks ?? [],
    folders: options?.folders ?? [
      {
        createdAt: '2026-09-08T00:00:00.000Z',
        id: DESTINATION_FOLDER_ID,
        name: 'Destination',
        parentFolderId: null,
      },
    ],
    rootFolderId: DESTINATION_FOLDER_ID,
    version: 1,
  },
});

export const createFolder = (
  id: string,
  name: string,
): DriveFolderDiscoveryResult => ({
  id,
  kind: 'folder',
  name,
  rootKind: 'my-drive',
  shared: false,
});

export const createDescendantFolder = (
  id: string,
  name: string,
  parentFolderId: string,
): DriveEnumeratedFolder => ({
  id,
  name,
  parentFolderId,
  rootKind: 'my-drive',
  shared: false,
});

export const createAudio = (
  driveFileId: string,
  name: string,
  parentFolderId?: string,
): DriveAudioDiscoveryResult | DriveEnumeratedAudioSource => ({
  ...createDriveAudioSource({
    availability: { status: 'available' },
    driveFileId,
    mimeType: 'audio/mpeg',
    name,
  }),
  ...(parentFolderId ? { parentFolderId } : { kind: 'audio' as const }),
});

export const createUnsupportedAudio = (
  driveFileId: string,
  parentFolderId: string,
): DriveEnumeratedAudioSource => ({
  ...createDriveAudioSource({
    availability: {
      message: 'This file type is not supported.',
      reason: 'unsupported-format',
      status: 'unavailable',
    },
    driveFileId,
    mimeType: 'application/octet-stream',
    name: `${driveFileId}.bin`,
  }),
  parentFolderId,
});

export const createSelection = (options: {
  audio?: DriveAudioDiscoveryResult[];
  folders?: DriveFolderDiscoveryResult[];
}): NormalizedDriveImportSelection => ({
  audio: options.audio ?? [],
  folders: options.folders ?? [],
  overlapCounts: {
    coveredAudio: 0,
    duplicateSelections: 0,
    nestedFolders: 0,
    total: 0,
  },
});
