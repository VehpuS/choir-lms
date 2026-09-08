import type {
  DriveDiscoveredAudioSource,
  DriveEnumeratedAudioSource,
  DriveEnumeratedFolder,
  DriveFolder,
  DriveFolderContents,
} from '@org/google-drive';

import {
  classifyDriveImportIntents,
  type ClassifiedDriveImportFolderIntent,
  type ClassifiedDriveImportTrackIntent,
  type DriveImportLibraryState,
} from './drive-import-plan-classification';
import type { NormalizedDriveImportSelection } from './drive-import-selection-normalizer';

export type DriveImportMode = 'flatten' | 'preserve-structure';

export type DriveImportFolderTarget =
  | {
      folderId: string;
      kind: 'library-folder';
    }
  | {
      driveFolderId: string;
      kind: 'planned-folder';
    };

export type DriveImportFolderIntent = {
  folder: DriveFolder;
  parent: DriveImportFolderTarget;
};

export type DriveImportTrackIntent = {
  source: DriveDiscoveredAudioSource;
  targetFolder: DriveImportFolderTarget;
};

export type DriveImportPlan = {
  destinationFolderId: string;
  folders: ClassifiedDriveImportFolderIntent[];
  mode: DriveImportMode;
  summary: {
    alreadyPresentTracks: number;
    foldersToCreate: number;
    newTracks: number;
    reusableTracks: number;
    tracksToImport: number;
    unsupportedFiles: number;
  };
  tracks: ClassifiedDriveImportTrackIntent[];
  unsupportedSources: DriveEnumeratedAudioSource[];
};

type CreateDriveImportPlanOptions = {
  contentsByFolderId: ReadonlyMap<string, DriveFolderContents>;
  destinationFolderId: string;
  libraryState: DriveImportLibraryState;
  mode: DriveImportMode;
  selection: NormalizedDriveImportSelection;
};

const createLibraryFolderTarget = (
  folderId: string,
): DriveImportFolderTarget => ({
  folderId,
  kind: 'library-folder',
});

const createPlannedFolderTarget = (
  driveFolderId: string,
): DriveImportFolderTarget => ({
  driveFolderId,
  kind: 'planned-folder',
});

const orderFoldersByParent = (
  rootFolderId: string,
  folders: readonly DriveEnumeratedFolder[],
) => {
  const orderedFolders: DriveEnumeratedFolder[] = [];
  const knownFolderIds = new Set([rootFolderId]);
  const pendingFolders = [...folders];

  while (pendingFolders.length > 0) {
    const nextFolderIndex = pendingFolders.findIndex((folder) =>
      knownFolderIds.has(folder.parentFolderId),
    );

    if (nextFolderIndex === -1) {
      throw new Error(
        `Drive folder ${rootFolderId} has an incomplete descendant hierarchy.`,
      );
    }

    const [nextFolder] = pendingFolders.splice(nextFolderIndex, 1);

    if (!nextFolder) {
      continue;
    }

    knownFolderIds.add(nextFolder.id);
    orderedFolders.push(nextFolder);
  }

  return orderedFolders;
};

export const createDriveImportPlan = (
  options: CreateDriveImportPlanOptions,
): DriveImportPlan => {
  const destinationTarget = createLibraryFolderTarget(
    options.destinationFolderId,
  );
  const folders: DriveImportFolderIntent[] = [];
  const tracks: DriveImportTrackIntent[] = [];
  const seenFolderIds = new Set<string>();
  const seenPlayableSourceIds = new Set<string>();
  const folderContents: DriveFolderContents[] = [];

  const addTrack = (
    source: DriveDiscoveredAudioSource,
    targetFolder: DriveImportFolderTarget,
  ) => {
    if (seenPlayableSourceIds.has(source.driveFileId)) {
      return;
    }

    seenPlayableSourceIds.add(source.driveFileId);
    tracks.push({ source, targetFolder });
  };

  for (const source of options.selection.audio) {
    addTrack(source, destinationTarget);
  }

  for (const rootFolder of options.selection.folders) {
    const contents = options.contentsByFolderId.get(rootFolder.id);

    if (!contents) {
      throw new Error(
        `Drive folder ${rootFolder.id} is missing complete import contents.`,
      );
    }

    folderContents.push(contents);
    const orderedFolders = orderFoldersByParent(
      rootFolder.id,
      contents.folders,
    );

    if (options.mode === 'preserve-structure') {
      if (!seenFolderIds.has(rootFolder.id)) {
        folders.push({ folder: rootFolder, parent: destinationTarget });
        seenFolderIds.add(rootFolder.id);
      }

      for (const folder of orderedFolders) {
        if (seenFolderIds.has(folder.id)) {
          continue;
        }

        folders.push({
          folder,
          parent: createPlannedFolderTarget(folder.parentFolderId),
        });
        seenFolderIds.add(folder.id);
      }
    }

    for (const source of contents.playableSources) {
      addTrack(
        source,
        options.mode === 'flatten'
          ? destinationTarget
          : createPlannedFolderTarget(source.parentFolderId),
      );
    }
  }

  const unsupportedSources: DriveEnumeratedAudioSource[] = [];
  const seenUnsupportedSourceIds = new Set<string>();

  for (const contents of folderContents) {
    for (const source of contents.unavailableSources) {
      if (
        seenPlayableSourceIds.has(source.driveFileId) ||
        seenUnsupportedSourceIds.has(source.driveFileId)
      ) {
        continue;
      }

      seenUnsupportedSourceIds.add(source.driveFileId);
      unsupportedSources.push(source);
    }
  }

  const classifiedIntents = classifyDriveImportIntents({
    folders,
    libraryState: options.libraryState,
    tracks,
  });
  const classifications = classifiedIntents.tracks.map(
    ({ classification }) => classification,
  );

  return {
    destinationFolderId: options.destinationFolderId,
    folders: classifiedIntents.folders,
    mode: options.mode,
    summary: {
      alreadyPresentTracks: classifications.filter(
        (classification) => classification === 'already-present',
      ).length,
      foldersToCreate: classifiedIntents.folders.filter(
        ({ status }) => status === 'create',
      ).length,
      newTracks: classifications.filter(
        (classification) => classification === 'new',
      ).length,
      reusableTracks: classifications.filter(
        (classification) => classification === 'reusable',
      ).length,
      tracksToImport: classifiedIntents.tracks.length,
      unsupportedFiles: unsupportedSources.length,
    },
    tracks: classifiedIntents.tracks,
    unsupportedSources,
  };
};
