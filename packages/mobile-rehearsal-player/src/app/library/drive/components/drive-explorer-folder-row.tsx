import { AppIcon } from '../../../components/app-icon';
import { RowMetaLine } from '../../../components/row-meta-line';
import { appTheme } from '../../../utils/theme';
import { ExplorerListRow } from '../../components/explorer/index';
import { SearchHighlightedText } from '../../search/components/search-highlighted-text';
import type { DriveLibraryFolder } from '../utils/drive-library-view-model';
import { getDriveRowSelectionGlyph } from './drive-explorer-row-model';
import {
  DRIVE_ROW_LEADING_GLYPH_SIZE,
  DRIVE_ROW_TITLE_LINES,
  driveExplorerListStyles as styles,
} from './drive-explorer-list-styles';

const CHEVRON_SIZE = 16;

type DriveExplorerFolderRowProps = {
  folder: DriveLibraryFolder;
  highlightQuery: string | null;
  isSelected?: boolean;
  metadataLabels: string[];
  onOpenFolder: (folder: DriveLibraryFolder) => void;
};

// An Add folder row (screen 1e): folder glyph, title, `Updated 3 Nov` meta,
// and a trailing chevron. Selection mode swaps the glyph for the selection
// circle and drops the chevron, since tapping selects instead of opening.
export const DriveExplorerFolderRow = ({
  folder,
  highlightQuery,
  isSelected,
  metadataLabels,
  onOpenFolder,
}: DriveExplorerFolderRowProps) => {
  const metadataLabel = metadataLabels.join(' · ');
  const isSelectionMode = isSelected !== undefined;
  const leadingGlyph = isSelectionMode
    ? getDriveRowSelectionGlyph(isSelected)
    : { color: appTheme.colors.icon, name: 'folder-outline' as const };

  return (
    <ExplorerListRow
      active={isSelected}
      leadingIcon={
        <AppIcon
          color={leadingGlyph.color}
          name={leadingGlyph.name}
          size={DRIVE_ROW_LEADING_GLYPH_SIZE}
        />
      }
      metadata={metadataLabel ? <RowMetaLine text={metadataLabel} /> : null}
      onPress={() => {
        onOpenFolder(folder);
      }}
      selected={isSelected}
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
