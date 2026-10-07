import type {
  DriveBrowseLocation,
  DriveDiscoveryResult,
} from '@org/google-drive';

import {
  attachBrowsePath,
  getBrowseCoveredRowIds,
  getSelectedFolderIds,
  isCoveredBySelectedFolder,
} from '../utils/drive-basket-model';
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

// Rows inside a selected folder: in search each row carries its path; in
// browse every row shares the folder being browsed.
const getCoveredRowIds = ({
  isSearchMode,
  navigationStack,
  rows,
  selection,
}: BuildDriveRowSelectionOptions): ReadonlySet<string> => {
  const selectedFolderIds = getSelectedFolderIds(selection.selectedResults);

  if (selectedFolderIds.size === 0) {
    return new Set();
  }

  if (!isSearchMode) {
    return getBrowseCoveredRowIds({
      navigationStack,
      rowIds: rows.map(({ key }) => key),
      selectedFolderIds,
    });
  }

  return new Set(
    rows
      .filter((row) =>
        isCoveredBySelectedFolder(getRowPath(row), selectedFolderIds),
      )
      .map(({ key }) => key),
  );
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

  return {
    coveredIds: getCoveredRowIds(options),
    isActive: selection.isActive,
    onEnter: (row) => {
      selection.enter();
      selection.toggle(resolveResult(row));
    },
    onToggle: (row) => {
      selection.toggle(resolveResult(row));
    },
    selectedIds: selection.selectedResultIds,
  };
};
