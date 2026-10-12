import type {
  DriveBrowseLocation,
  DriveDiscoveryResult,
} from '@org/google-drive';

import {
  attachBrowsePath,
  getBrowseCoveringFolderName,
  getCoveringFolderName,
  getSelectedFolderIds,
} from '../utils/drive-basket-model';
import {
  collectAncestorIds,
  getPartialRowIds,
} from '../../selection/partial-rows';
import type { DriveExplorerListSelection } from './drive-explorer-list';
import {
  resolveDriveDiscoveryResultFromRow,
  type DriveDiscoveryExplorerRow,
} from './drive-explorer-row-model';

type DriveRowSelectionSource = {
  enter: () => void;
  isActive: boolean;
  selectedResultIds: ReadonlySet<string>;
  selectedResults: readonly DriveDiscoveryResult[];
  toggle: (result: DriveDiscoveryResult) => void;
};

type BuildDriveRowSelectionOptions = {
  isSearchMode: boolean;
  navigationStack: readonly DriveBrowseLocation[];
  rows: readonly DriveDiscoveryExplorerRow[];
  selection: DriveRowSelectionSource;
};

const getRowPath = (row: DriveDiscoveryExplorerRow) =>
  row.kind === 'folder' ? row.folder.path : row.source.path;

// Rows inside a selected folder, each with that folder's name: in search each
// row carries its path; in browse every row shares the folder being browsed.
const getCoveringFolderNames = ({
  isSearchMode,
  navigationStack,
  rows,
  selection,
}: BuildDriveRowSelectionOptions): ReadonlyMap<string, string> => {
  const selectedFolderIds = getSelectedFolderIds(selection.selectedResults);
  const names = new Map<string, string>();

  if (selectedFolderIds.size === 0) {
    return names;
  }

  if (!isSearchMode) {
    const folderName = getBrowseCoveringFolderName({
      navigationStack,
      selectedFolderIds,
    });

    if (folderName !== undefined) {
      rows.forEach(({ key }) => names.set(key, folderName));
    }

    return names;
  }

  for (const row of rows) {
    const folderName = getCoveringFolderName(
      getRowPath(row),
      selectedFolderIds,
    );

    if (folderName !== undefined) {
      names.set(row.key, folderName);
    }
  }

  return names;
};

// Search results already carry their path; a browse row is picked from the
// folder being browsed, so its path comes from the navigation stack.
export const buildDriveRowSelection = (
  options: BuildDriveRowSelectionOptions,
): DriveExplorerListSelection => {
  const { isSearchMode, navigationStack, selection } = options;
  const resolveResult = (row: DriveDiscoveryExplorerRow) => {
    const result = resolveDriveDiscoveryResultFromRow(row);

    return isSearchMode ? result : attachBrowsePath(result, navigationStack);
  };

  const coveringFolderNames = getCoveringFolderNames(options);
  const coveredIds = new Set(coveringFolderNames.keys());
  // Folders whose subtree holds a selected item, from each item's path ids.
  const partialIds = getPartialRowIds({
    ancestorIds: collectAncestorIds(
      selection.selectedResults.map((result) =>
        result.path?.map((segment) => segment.id),
      ),
    ),
    coveredIds,
    rowIds: options.rows.map(({ key }) => key),
    selectedIds: selection.selectedResultIds,
  });

  return {
    coveredIds,
    coveringFolderNames,
    isActive: selection.isActive,
    onEnter: (row) => {
      selection.enter();
      selection.toggle(resolveResult(row));
    },
    onToggle: (row) => {
      selection.toggle(resolveResult(row));
    },
    partialIds,
    selectedIds: selection.selectedResultIds,
  };
};
