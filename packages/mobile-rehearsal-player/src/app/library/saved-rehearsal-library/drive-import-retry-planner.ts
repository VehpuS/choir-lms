import {
  classifyDriveImportIntents,
  type DriveImportLibraryState,
} from './drive-import-plan-classification';
import type {
  DriveImportFolderTarget,
  DriveImportPlan,
} from './drive-import-planner';
import type { DriveImportOutcome } from './drive-import-status';

type CreateDriveImportRetryPlanOptions = {
  libraryState: DriveImportLibraryState;
  outcomes: readonly DriveImportOutcome[];
  plan: DriveImportPlan;
};

const isRetryableOutcome = (outcome: DriveImportOutcome) =>
  outcome.status === 'cancelled' || outcome.status === 'failed';

const resolveRetryTarget = (options: {
  folderIdsByDriveId: ReadonlyMap<string, string>;
  pendingDriveFolderIds: ReadonlySet<string>;
  target: DriveImportFolderTarget;
}): DriveImportFolderTarget => {
  if (
    options.target.kind === 'library-folder' ||
    options.pendingDriveFolderIds.has(options.target.driveFolderId)
  ) {
    return options.target;
  }

  const folderId = options.folderIdsByDriveId.get(options.target.driveFolderId);

  if (!folderId) {
    throw new Error(
      `Drive folder ${options.target.driveFolderId} has no retry destination.`,
    );
  }

  return { folderId, kind: 'library-folder' };
};

export const createDriveImportRetryPlan = (
  options: CreateDriveImportRetryPlanOptions,
): DriveImportPlan => {
  const retryableItemIds = new Set(
    options.outcomes.filter(isRetryableOutcome).map(({ itemId }) => itemId),
  );
  const replanned = classifyDriveImportIntents({
    folders: options.plan.folders,
    libraryState: options.libraryState,
    tracks: options.plan.tracks,
  });
  const folders = replanned.folders.filter(({ libraryFolderId }) =>
    retryableItemIds.has(libraryFolderId),
  );
  const pendingDriveFolderIds = new Set(folders.map(({ folder }) => folder.id));
  const folderIdsByDriveId = new Map(
    replanned.folders.map(({ folder, libraryFolderId }) => [
      folder.id,
      libraryFolderId,
    ]),
  );
  const retryFolders = folders.map((intent) => ({
    ...intent,
    parent: resolveRetryTarget({
      folderIdsByDriveId,
      pendingDriveFolderIds,
      target: intent.parent,
    }),
  }));
  const retryTracks = replanned.tracks
    .filter(
      ({ canonicalSourceId, libraryFileLinkId }) =>
        retryableItemIds.has(canonicalSourceId) ||
        retryableItemIds.has(libraryFileLinkId),
    )
    .map((intent) => ({
      ...intent,
      targetFolder: resolveRetryTarget({
        folderIdsByDriveId,
        pendingDriveFolderIds,
        target: intent.targetFolder,
      }),
    }));
  const classifications = retryTracks.map(
    ({ classification }) => classification,
  );

  return {
    destinationFolderId: options.plan.destinationFolderId,
    folders: retryFolders,
    mode: options.plan.mode,
    summary: {
      alreadyPresentTracks: classifications.filter(
        (classification) => classification === 'already-present',
      ).length,
      foldersToCreate: retryFolders.filter(({ status }) => status === 'create')
        .length,
      newTracks: classifications.filter(
        (classification) => classification === 'new',
      ).length,
      reusableTracks: classifications.filter(
        (classification) => classification === 'reusable',
      ).length,
      tracksToImport: retryTracks.length,
      unsupportedFiles: 0,
    },
    tracks: retryTracks,
    unsupportedSources: [],
  };
};
