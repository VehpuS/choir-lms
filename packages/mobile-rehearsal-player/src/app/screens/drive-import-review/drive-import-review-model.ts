import type { RehearsalLibraryFolderNode } from '@org/audio-library-models';
import type { DriveDiscoveryResult } from '@org/google-drive';

import type { DriveImportMode } from '../../library/saved-rehearsal-library/drive-import-planner';
import type { DriveImportReviewSummary } from '../../library/saved-rehearsal-library/drive-import-status';

export const DEFAULT_DRIVE_IMPORT_MODE: DriveImportMode = 'preserve-structure';

export type DriveImportDestinationFolderOption = {
  folder: RehearsalLibraryFolderNode;
  label: string;
};

export type DriveImportReviewSummaryRow = {
  key: keyof DriveImportReviewSummary;
  label: string;
  value: number;
};

export const hasFolderInSelection = (
  selection: readonly DriveDiscoveryResult[],
) => selection.some((result) => result.kind === 'folder');

export const resolveDriveImportReviewMode = (options: {
  hasFolderSelection: boolean;
  selectedMode: DriveImportMode | null;
}): DriveImportMode => {
  if (!options.hasFolderSelection) {
    return 'flatten';
  }

  return options.selectedMode ?? DEFAULT_DRIVE_IMPORT_MODE;
};

export const sortDriveImportDestinationFolders = (
  destinationFolders: readonly DriveImportDestinationFolderOption[],
) =>
  [...destinationFolders].sort((first, second) =>
    first.label.localeCompare(second.label),
  );

export const buildDriveImportReviewSummaryRows = (
  reviewSummary: DriveImportReviewSummary,
): DriveImportReviewSummaryRow[] => [
  {
    key: 'foldersToCreate',
    label: 'Folders to create',
    value: reviewSummary.foldersToCreate,
  },
  {
    key: 'newTracks',
    label: 'New tracks',
    value: reviewSummary.newTracks,
  },
  {
    key: 'reusableTracks',
    label: 'Reused tracks',
    value: reviewSummary.reusableTracks,
  },
  {
    key: 'alreadyPresentTracks',
    label: 'Already in destination',
    value: reviewSummary.alreadyPresentTracks,
  },
  {
    key: 'unsupportedFiles',
    label: 'Unsupported files skipped',
    value: reviewSummary.unsupportedFiles,
  },
  {
    key: 'collapsedOverlaps',
    label: 'Overlapping selections collapsed',
    value: reviewSummary.collapsedOverlaps,
  },
];
