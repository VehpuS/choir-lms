import { ExplorerListSurface } from '../../components/explorer/index';
import type { DriveLibrarySourceAction } from '../utils/drive-library-source-actions';
import type {
  DriveLibraryFolder,
  DriveLibrarySource,
} from '../utils/drive-library-view-model';

import type { DriveDiscoveryExplorerRow } from './drive-discovery-panel-model';
import { DriveExplorerFolderRow } from './drive-explorer-folder-row';
import { getDriveExplorerRowSelectionState } from './drive-explorer-row-model';
import { DriveExplorerSourceRow } from './drive-explorer-source-row';

type DriveExplorerListProps = {
  getActions: (source: DriveLibrarySource) => DriveLibrarySourceAction[] | null;
  getMessage: (source: DriveLibrarySource) => string | undefined;
  highlightQuery?: string | null;
  isSelectionMode?: boolean;
  onOpenFolder: (folder: DriveLibraryFolder) => void;
  onToggleSelection?: (row: DriveDiscoveryExplorerRow) => void;
  rows: DriveDiscoveryExplorerRow[];
  selectedResultIds?: ReadonlySet<string>;
};

export const DriveExplorerList = ({
  getActions,
  getMessage,
  highlightQuery,
  isSelectionMode = false,
  onOpenFolder,
  onToggleSelection,
  rows,
  selectedResultIds,
}: DriveExplorerListProps) => {
  return (
    <ExplorerListSurface>
      {rows.map((row) => {
        const isSelected = getDriveExplorerRowSelectionState({
          isSelectionMode,
          row,
          selectedResultIds,
        });
        const onSelect =
          isSelectionMode && onToggleSelection
            ? () => onToggleSelection(row)
            : undefined;

        if (row.kind === 'folder') {
          return (
            <DriveExplorerFolderRow
              folder={row.folder}
              highlightQuery={row.highlightQuery}
              isSelected={isSelected}
              key={row.key}
              metadataLabels={row.metadataLabels}
              onOpenFolder={onSelect ?? onOpenFolder}
            />
          );
        }

        return (
          <DriveExplorerSourceRow
            getActions={getActions}
            getMessage={getMessage}
            highlightQuery={row.highlightQuery ?? highlightQuery}
            isSelected={isSelected}
            key={row.key}
            metadataLabels={row.metadataLabels}
            onToggleSelection={onSelect}
            source={row.source}
          />
        );
      })}
    </ExplorerListSurface>
  );
};
