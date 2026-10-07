import { ExplorerListSurface } from '../../components/explorer/index';
import type { ExplorerRowSelection } from '../../components/explorer/model';
import type { DriveLibrarySourceAction } from '../utils/drive-library-source-actions';
import type {
  DriveLibraryFolder,
  DriveLibrarySource,
} from '../utils/drive-library-view-model';

import type { DriveDiscoveryExplorerRow } from './drive-discovery-panel-model';
import { DriveExplorerFolderRow } from './drive-explorer-folder-row';
import { DriveExplorerSourceRow } from './drive-explorer-source-row';

type DriveExplorerListProps = {
  getActions: (source: DriveLibrarySource) => DriveLibrarySourceAction[] | null;
  getMessage: (source: DriveLibrarySource) => string | undefined;
  highlightQuery?: string | null;
  onOpenFolder: (folder: DriveLibraryFolder) => void;
  rows: DriveDiscoveryExplorerRow[];
  /** Wires rows to the shared selection model; rows are not selectable without it. */
  selection?: DriveExplorerListSelection;
};

export type DriveExplorerListSelection = {
  /**
   * Rows that sit inside a selected folder. They read as selected and a tap
   * does nothing, since the folder already brings them into the import.
   */
  coveredIds?: ReadonlySet<string>;
  isActive: boolean;
  onEnter: (row: DriveDiscoveryExplorerRow) => void;
  onToggle: (row: DriveDiscoveryExplorerRow) => void;
  selectedIds: ReadonlySet<string>;
};

const getRowSelection = (
  row: DriveDiscoveryExplorerRow,
  selection: DriveExplorerListSelection | undefined,
): ExplorerRowSelection | undefined => {
  if (selection === undefined) {
    return undefined;
  }

  const isCovered =
    !selection.selectedIds.has(row.key) &&
    (selection.coveredIds?.has(row.key) ?? false);

  return {
    isActive: selection.isActive,
    isSelected: isCovered || selection.selectedIds.has(row.key),
    onEnter: () => {
      selection.onEnter(row);
    },
    onToggle: () => {
      if (!isCovered) {
        selection.onToggle(row);
      }
    },
  };
};

export const DriveExplorerList = ({
  getActions,
  getMessage,
  highlightQuery,
  onOpenFolder,
  rows,
  selection,
}: DriveExplorerListProps) => {
  return (
    <ExplorerListSurface>
      {rows.map((row) => {
        const rowSelection = getRowSelection(row, selection);

        if (row.kind === 'folder') {
          return (
            <DriveExplorerFolderRow
              folder={row.folder}
              highlightQuery={row.highlightQuery}
              key={row.key}
              metadataLabels={row.metadataLabels}
              onOpenFolder={onOpenFolder}
              selection={rowSelection}
            />
          );
        }

        return (
          <DriveExplorerSourceRow
            getActions={getActions}
            getMessage={getMessage}
            highlightQuery={row.highlightQuery ?? highlightQuery}
            key={row.key}
            metadataLabels={row.metadataLabels}
            selection={rowSelection}
            source={row.source}
          />
        );
      })}
    </ExplorerListSurface>
  );
};
