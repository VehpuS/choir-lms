import { Pressable, StyleSheet, Text, View } from 'react-native';

import {
  buttonInteractionGuardStyle,
  interactionGuardProps,
} from '../../../components/interaction-guard';
import { AppIcon } from '../../../components/app-icon';
import { CompactPlaybackAction } from '../../../components/compact-playback-action';
import { SurfaceIconButton } from '../../../components/surface-icon-button';
import { OverflowMenuTrigger } from '../../../components/overflow-menu-trigger';
import { RowMetaLine } from '../../../components/row-meta-line';
import { RowPreparingIndicator } from '../../../components/row-preparing-indicator';
import { appTheme } from '../../../utils/theme';
import type { UseLibraryFilesResult } from '../../saved-rehearsal-library/use-library-files';
import { SearchHighlightedText } from '../../search/components/search-highlighted-text';
import { ExplorerListRow, ExplorerListSurface } from '../explorer';
import type { ExplorerRowSelection } from '../explorer/model';
import { OptionsMenuSheet } from '../options-menu-sheet';
import { SavedTrackMenuProvenance } from '../saved-item-menu/saved-track-menu-provenance';
import type { OptionsMenuAction } from '../options-menu-sheet/model';
import { resolveOfflineRowLeading } from '../../offline/offline-row-mark';
import {
  offlineStateStore,
  useOfflineRevision,
} from '../../offline/offline-state';
import { resolveFilesRowMenuTitle } from './files-row-actions';
import type { SavedRehearsalLibraryFilesViewModel } from './files-view-model';

const LEADING_GLYPH_SIZE = 20;
const OPEN_FOLDER_CHEVRON_SIZE = 16;

export type FilesExplorerListSelection = {
  getRowSelection: (
    row: NonNullable<UseLibraryFilesResult['explorer']>['rows'][number],
  ) => ExplorerRowSelection;
  isActive: boolean;
  onOpenFolder: (folderId: string) => void;
};

export const FilesExplorerList = (options: {
  createMenuActions: (
    row: NonNullable<UseLibraryFilesResult['explorer']>['rows'][number],
  ) => OptionsMenuAction[];
  openMenuRowKey: string | null;
  rows: NonNullable<UseLibraryFilesResult['explorer']>['rows'];
  searchQuery: string | null;
  selection?: FilesExplorerListSelection;
  setOpenMenuRowKey: (rowKey: string | null) => void;
  viewModel: SavedRehearsalLibraryFilesViewModel;
}) => {
  // Menus and marks are built per row, so the list re-renders when any
  // file's offline state changes.
  useOfflineRevision();

  return (
    <ExplorerListSurface>
      {options.rows.map((row, index) => {
        const viewModelRow = options.viewModel.rows[index];
        const rowAddAction = viewModelRow.addAction;
        const menuActions = options.createMenuActions(row);
        const isOptionsVisible = options.openMenuRowKey === viewModelRow.key;

        return (
          <View key={viewModelRow.key}>
            <ExplorerListRow
              // Selection can still pick an unavailable row, for removal.
              disabled={viewModelRow.disabled && !options.selection?.isActive}
              leadingIcon={
                <AppIcon
                  color={
                    viewModelRow.isActive
                      ? appTheme.colors.accentText
                      : appTheme.colors.icon
                  }
                  name={viewModelRow.leadingIconName}
                  size={LEADING_GLYPH_SIZE}
                />
              }
              actions={
                viewModelRow.playbackRing ? (
                  <CompactPlaybackAction
                    accessibilityLabel={
                      viewModelRow.playbackRing.accessibilityLabel
                    }
                    disabled={viewModelRow.playbackRing.disabled}
                    iconName={viewModelRow.playbackRing.iconName}
                    onPress={viewModelRow.playbackRing.onPress}
                    selected={viewModelRow.isActive}
                    variant="row"
                  />
                ) : rowAddAction ? (
                  <Pressable
                    accessibilityLabel={rowAddAction.accessibilityLabel}
                    accessibilityRole="button"
                    {...interactionGuardProps}
                    disabled={rowAddAction.disabled}
                    onPress={rowAddAction.onPress}
                    style={({ pressed }) => [
                      styles.rowActionButton,
                      buttonInteractionGuardStyle,
                      pressed && !rowAddAction.disabled
                        ? styles.rowActionButtonPressed
                        : undefined,
                      rowAddAction.disabled
                        ? styles.rowActionButtonDisabled
                        : undefined,
                    ]}
                  >
                    <Text style={styles.rowActionButtonLabel}>
                      {rowAddAction.label}
                    </Text>
                  </Pressable>
                ) : null
              }
              message={
                viewModelRow.isPreparingLoop ? (
                  <RowPreparingIndicator label="Preparing loop…" />
                ) : viewModelRow.message ? (
                  <Text numberOfLines={2} style={styles.rowMessage}>
                    {viewModelRow.message}
                  </Text>
                ) : null
              }
              metadata={
                <RowMetaLine
                  leading={resolveOfflineRowLeading(
                    offlineStateStore.getState(
                      (row.kind === 'track' || row.kind === 'loop'
                        ? row.source?.driveFileId
                        : undefined) ?? '',
                    ),
                  )}
                  text={viewModelRow.metaLabel}
                />
              }
              onPress={viewModelRow.onPress}
              selection={options.selection?.getRowSelection(row)}
              overflowTrigger={
                options.selection?.isActive && row.kind === 'folder' ? (
                  // In selection mode a tap on the row selects it, so the
                  // folder keeps its own control for opening it.
                  <SurfaceIconButton
                    accessibilityLabel={`Open ${row.label}`}
                    icon="chevron-right"
                    onPress={() => {
                      options.selection?.onOpenFolder(row.folder.id);
                    }}
                    size={OPEN_FOLDER_CHEVRON_SIZE}
                  />
                ) : menuActions.length > 0 ? (
                  <OverflowMenuTrigger
                    accessibilityLabel={`${resolveFilesRowMenuTitle(row)} options`}
                    onPress={() => {
                      options.setOpenMenuRowKey(viewModelRow.key);
                    }}
                    style={styles.rowOverflowTrigger}
                  />
                ) : null
              }
              title={
                <SearchHighlightedText
                  numberOfLines={1}
                  query={options.searchQuery}
                  style={[
                    styles.rowTitle,
                    viewModelRow.isActive ? styles.rowTitleActive : undefined,
                  ]}
                  text={viewModelRow.label}
                />
              }
            />
            <OptionsMenuSheet
              actions={menuActions.map((action) => {
                return {
                  ...action,
                  onPress: () => {
                    options.setOpenMenuRowKey(null);
                    action.onPress();
                  },
                };
              })}
              isVisible={isOptionsVisible}
              onClose={() => {
                options.setOpenMenuRowKey(null);
              }}
              title={resolveFilesRowMenuTitle(row)}
            >
              {row.kind === 'track' ? (
                <SavedTrackMenuProvenance source={row.source} />
              ) : null}
            </OptionsMenuSheet>
          </View>
        );
      })}
    </ExplorerListSurface>
  );
};

const styles = StyleSheet.create({
  rowActionButton: {
    alignSelf: 'center',
    borderRadius: 999,
    borderWidth: 1,
    borderColor: appTheme.colors.accentBorderSoft,
    paddingHorizontal: 10,
    paddingVertical: 7,
  },
  rowActionButtonDisabled: {
    opacity: 0.55,
  },
  rowActionButtonLabel: {
    ...appTheme.type.button,
    color: appTheme.colors.accentText,
  },
  rowActionButtonPressed: {
    backgroundColor: appTheme.colors.accentRegionFill,
  },
  rowMessage: {
    color: appTheme.colors.danger,
    fontSize: 12,
    lineHeight: 17,
  },
  rowOverflowTrigger: {
    position: 'relative',
    top: 0,
    right: 0,
  },
  rowTitle: {
    ...appTheme.type.rowTitle,
    color: appTheme.colors.text,
  },
  // The playing row is marked by its title, glyph, and ring, never a fill.
  rowTitleActive: {
    color: appTheme.colors.accentText,
  },
});
