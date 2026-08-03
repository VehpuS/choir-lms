import { MaterialCommunityIcons } from '@expo/vector-icons';
import { Pressable, StyleSheet, Text, View } from 'react-native';

import {
  buttonInteractionGuardStyle,
  interactionGuardProps,
} from '../../../components/interaction-guard';
import { OverflowMenuTrigger } from '../../../components/overflow-menu-trigger';
import { appTheme } from '../../../utils/theme';
import type { UseLibraryFilesResult } from '../../saved-rehearsal-library/use-library-files';
import { ExplorerListRow, ExplorerListSurface } from '../explorer';
import { OptionsMenuSheet } from '../options-menu-sheet';
import type { OptionsMenuAction } from '../options-menu-sheet/model';
import { resolveFilesRowMenuTitle } from './files-row-actions';
import type { SavedRehearsalLibraryFilesViewModel } from './files-view-model';

const getRowIconName = (
  row: NonNullable<UseLibraryFilesResult['explorer']>['rows'][number],
) => {
  switch (row.kind) {
    case 'folder':
      return 'folder-outline' as const;
    case 'loop':
      return 'repeat' as const;
    case 'playlist':
      return 'playlist-music-outline' as const;
    default:
      return 'music-note-outline' as const;
  }
};

export const FilesExplorerList = (options: {
  createMenuActions: (
    row: NonNullable<UseLibraryFilesResult['explorer']>['rows'][number],
  ) => OptionsMenuAction[];
  openMenuRowKey: string | null;
  rows: NonNullable<UseLibraryFilesResult['explorer']>['rows'];
  setOpenMenuRowKey: (rowKey: string | null) => void;
  viewModel: SavedRehearsalLibraryFilesViewModel;
}) => {
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
              active={viewModelRow.active}
              disabled={viewModelRow.disabled}
              leadingIcon={
                <MaterialCommunityIcons
                  color={
                    viewModelRow.active
                      ? '#173229'
                      : appTheme.colors.secondaryText
                  }
                  name={getRowIconName(row)}
                  size={22}
                />
              }
              actions={
                rowAddAction ? (
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
                viewModelRow.message ? (
                  <Text numberOfLines={2} style={styles.rowMessage}>
                    {viewModelRow.message}
                  </Text>
                ) : null
              }
              metadata={
                <Text numberOfLines={1} style={styles.rowSupportingLabel}>
                  {viewModelRow.supportingLabel}
                </Text>
              }
              onPress={viewModelRow.onPress}
              overflowTrigger={
                menuActions.length > 0 ? (
                  <OverflowMenuTrigger
                    accessibilityLabel={`${resolveFilesRowMenuTitle(row)} options`}
                    iconColor={appTheme.colors.secondaryText}
                    onPress={() => {
                      options.setOpenMenuRowKey(viewModelRow.key);
                    }}
                    style={styles.rowOverflowTrigger}
                  />
                ) : null
              }
              title={
                <Text numberOfLines={1} style={styles.rowTitle}>
                  {viewModelRow.label}
                </Text>
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
            />
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
    borderColor: '#abc8b6',
    paddingHorizontal: 10,
    paddingVertical: 7,
  },
  rowActionButtonDisabled: {
    opacity: 0.55,
  },
  rowActionButtonLabel: {
    color: '#1f5c40',
    fontSize: 12,
    fontWeight: '700',
  },
  rowActionButtonPressed: {
    backgroundColor: '#eef7f0',
  },
  rowMessage: {
    color: '#9a4d2d',
    fontSize: 12,
    lineHeight: 17,
  },
  rowOverflowTrigger: {
    position: 'relative',
    top: 0,
    right: 0,
  },
  rowSupportingLabel: {
    color: appTheme.colors.secondaryText,
    fontSize: 13,
    lineHeight: 18,
  },
  rowTitle: {
    color: appTheme.colors.primaryText,
    fontSize: 15,
    fontWeight: '700',
  },
});
