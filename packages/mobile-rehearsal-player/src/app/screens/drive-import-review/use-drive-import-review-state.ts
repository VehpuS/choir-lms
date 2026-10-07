import type { DriveDiscoveryResult } from '@org/google-drive';
import { useEffect, useState } from 'react';

import type { DriveImportController } from '../../library/saved-rehearsal-library/use-drive-import-controller';
import type { DriveImportMode } from '../../library/saved-rehearsal-library/drive-import-planner';
import {
  hasFolderInSelection,
  resolveDriveImportReviewMode,
  sortDriveImportDestinationFolders,
  type DriveImportDestinationFolderOption,
} from './drive-import-review-model';

const SELECTION_KEY_SEPARATOR = '|';

type UseDriveImportReviewStateOptions = {
  destinationFolders: readonly DriveImportDestinationFolderOption[];
  driveImport: DriveImportController;
  rootFolderId: string | null;
  selectedResults: readonly DriveDiscoveryResult[];
};

export const useDriveImportReviewState = (
  options: UseDriveImportReviewStateOptions,
) => {
  const hasFolderSelection = hasFolderInSelection(options.selectedResults);
  const [destinationFolderId, setDestinationFolderId] = useState<string | null>(
    options.rootFolderId,
  );
  const [selectedMode, setSelectedMode] = useState<DriveImportMode | null>(
    null,
  );
  // The basket can shrink inside the review, which changes the plan.
  const selectionKey = options.selectedResults
    .map(({ id }) => id)
    .join(SELECTION_KEY_SEPARATOR);
  const resolvedMode = resolveDriveImportReviewMode({
    hasFolderSelection,
    selectedMode,
  });

  useEffect(() => {
    if (destinationFolderId === null && options.rootFolderId !== null) {
      setDestinationFolderId(options.rootFolderId);
    }
  }, [destinationFolderId, options.rootFolderId]);

  useEffect(() => {
    if (destinationFolderId === null) {
      return;
    }

    void options.driveImport.plan({
      destinationFolderId,
      mode: resolvedMode,
      selection: options.selectedResults,
    });
  }, [destinationFolderId, resolvedMode, selectionKey]);

  return {
    destinationFolderId,
    destinationFolders: sortDriveImportDestinationFolders(
      options.destinationFolders,
    ),
    hasFolderSelection,
    mode: resolvedMode,
    selectDestinationFolder: setDestinationFolderId,
    selectMode: setSelectedMode,
  };
};
