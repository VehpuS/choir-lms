import { AppIcon } from '../../../components/app-icon';
import { SurfaceIconButton } from '../../../components/surface-icon-button';
import { RowMetaLine } from '../../../components/row-meta-line';
import { appTheme } from '../../../utils/theme';
import { ExplorerListRow } from '../../components/explorer/index';
import { SearchHighlightedText } from '../../search/components/search-highlighted-text';
import type { DriveLibraryFolder } from '../utils/drive-library-view-model';
import type { ExplorerRowSelection } from '../../components/explorer/model';
import {
  DRIVE_ROW_LEADING_GLYPH_SIZE,
  DRIVE_ROW_TITLE_LINES,
  driveExplorerListStyles as styles,
} from './drive-explorer-list-styles';

const CHEVRON_SIZE = 16;

type DriveExplorerFolderRowProps = {
  folder: DriveLibraryFolder;
  highlightQuery: string | null;
  metadataLabels: string[];
  onOpenFolder: (folder: DriveLibraryFolder) => void;
  selection?: ExplorerRowSelection;
};

// An Add folder row (screen 1e): folder glyph, title, `Updated 3 Nov` meta,
// and a trailing chevron. Selection mode swaps the glyph for the selection
// circle, and the chevron becomes its own button: tapping the row selects it,
// the chevron still opens it so a basket can be built across folders.
export const DriveExplorerFolderRow = ({
  folder,
  highlightQuery,
  metadataLabels,
  onOpenFolder,
  selection,
}: DriveExplorerFolderRowProps) => {
  const metadataLabel = metadataLabels.join(' · ');
  const isSelectionMode = selection?.isActive ?? false;
  const isSelected = isSelectionMode && selection?.isSelected;

  return (
    <ExplorerListRow
      leadingIcon={
        <AppIcon
          color={appTheme.colors.icon}
          name="folder-outline"
          size={DRIVE_ROW_LEADING_GLYPH_SIZE}
        />
      }
      metadata={metadataLabel ? <RowMetaLine text={metadataLabel} /> : null}
      onPress={() => {
        onOpenFolder(folder);
      }}
      overflowTrigger={
        isSelectionMode ? (
          <SurfaceIconButton
            accessibilityLabel={`Open ${folder.name}`}
            icon="chevron-right"
            onPress={() => {
              onOpenFolder(folder);
            }}
            size={CHEVRON_SIZE}
          />
        ) : undefined
      }
      selection={
        selection ? { ...selection, keepsTrailingControls: true } : undefined
      }
      title={
        <SearchHighlightedText
          numberOfLines={DRIVE_ROW_TITLE_LINES}
          query={highlightQuery}
          style={[styles.rowTitle, isSelected && styles.rowTitleSelected]}
          text={folder.name}
        />
      }
      trailingAccessory={
        isSelectionMode ? undefined : (
          <AppIcon
            color={appTheme.colors.textFaint}
            name="chevron-right"
            size={CHEVRON_SIZE}
          />
        )
      }
    />
  );
};
