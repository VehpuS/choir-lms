import { MaterialCommunityIcons } from '@expo/vector-icons';
import { StyleSheet, Text, View } from 'react-native';

import type { PlayableItem } from '@org/audio-library-models';

import { appTheme } from '../../../utils/theme';
import type { DriveLibrarySource } from '../../drive/utils/drive-library-view-model';
import type { UseLibraryFilesResult } from '../../saved-rehearsal-library/use-library-files';
import {
  ExplorerBreadcrumbBar,
  ExplorerListRow,
  ExplorerListSurface,
  ExplorerNavigationBar,
} from '../explorer';
import { FeedbackCard } from '../feedback-card';
import { buildSavedRehearsalLibraryFilesViewModel } from './files-view-model';

type SavedRehearsalLibraryFilesViewProps = {
  activePlayableItem: PlayableItem | null;
  files: UseLibraryFilesResult;
  onOpenPlaylist: (playlistId: string) => void;
  onTogglePlayableItemPlayback: (playableItem: PlayableItem) => Promise<void>;
  onToggleSourcePlayback: (source: DriveLibrarySource) => Promise<void>;
};

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

export const SavedRehearsalLibraryFilesView = ({
  activePlayableItem,
  files,
  onOpenPlaylist,
  onTogglePlayableItemPlayback,
  onToggleSourcePlayback,
}: SavedRehearsalLibraryFilesViewProps) => {
  const explorer = files.explorer;

  if (files.isLoading && !explorer) {
    return (
      <FeedbackCard
        message="Reading the saved Library Files structure from this device."
        title="Loading Files"
        tone="neutral"
      />
    );
  }

  if (files.issue && !explorer) {
    return (
      <FeedbackCard
        message={files.issue.message}
        title={files.issue.title}
        tone="error"
      />
    );
  }

  if (!explorer) {
    return null;
  }

  const viewModel = buildSavedRehearsalLibraryFilesViewModel({
    activePlayableItem,
    files,
    onOpenPlaylist,
    onTogglePlayableItemPlayback,
    onToggleSourcePlayback,
  });

  if (!viewModel) {
    return null;
  }

  return (
    <View style={styles.surface}>
      {files.issue ? (
        <FeedbackCard
          message={files.issue.message}
          size="compact"
          title={files.issue.title}
          tone="error"
        />
      ) : null}
      <ExplorerNavigationBar
        canGoBack={viewModel.canGoBack}
        eyebrow="Current folder"
        onGoBack={() => {
          files.goToParentFolder();
        }}
        title={viewModel.currentFolderName}
      />
      <ExplorerBreadcrumbBar items={viewModel.breadcrumbs} />
      <ExplorerListSurface>
        {explorer.rows.map((row, index) => {
          const viewModelRow = viewModel.rows[index];

          return (
            <ExplorerListRow
              active={viewModelRow.active}
              disabled={viewModelRow.disabled}
              key={viewModelRow.key}
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
                <View
                  accessible={false}
                  pointerEvents="none"
                  style={styles.rowMenuPlaceholder}
                >
                  <MaterialCommunityIcons
                    color={appTheme.colors.secondaryText}
                    name="dots-vertical"
                    size={20}
                  />
                </View>
              }
              title={
                <Text numberOfLines={1} style={styles.rowTitle}>
                  {viewModelRow.label}
                </Text>
              }
            />
          );
        })}
      </ExplorerListSurface>
    </View>
  );
};

const styles = StyleSheet.create({
  rowMenuPlaceholder: {
    minWidth: 38,
    minHeight: 38,
    paddingHorizontal: 10,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: appTheme.colors.border,
    borderRadius: 999,
    backgroundColor: '#fffdf8',
    opacity: 0.56,
  },
  rowMessage: {
    color: '#9a4d2d',
    fontSize: 12,
    lineHeight: 17,
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
  surface: {
    gap: 12,
  },
});
