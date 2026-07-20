import { MaterialCommunityIcons } from '@expo/vector-icons';
import { useState } from 'react';
import { StyleSheet, Text, View } from 'react-native';

import type { PlayableItem } from '@org/audio-library-models';

import type { DriveSessionMenuController } from '../../../auth/google-drive/components/drive-session-menu/drive-session-menu-controller';
import { OverflowMenuTrigger } from '../../../components/overflow-menu-trigger';
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
import { OptionsMenuSheet } from '../options-menu-sheet';
import { resolveFilesRowMenuTitle } from './files-row-actions';
import { buildSavedRehearsalLibraryFilesViewModel } from './files-view-model';
import type { LibraryFilesSuccessFeedback } from './library-files-success-feedback';
import { LibraryFilesSuccessFeedbackCard } from './library-files-success-feedback-card';
import { useLibraryFilesRowActionFlows } from './use-library-files-row-action-flows';

type SavedRehearsalLibraryFilesViewProps = {
  activePlayableItem: PlayableItem | null;
  authorization?: DriveSessionMenuController;
  canMutateLibrary: boolean;
  canMutateLoops: boolean;
  canMutatePlaylists: boolean;
  canQueueAsNext: boolean;
  files: UseLibraryFilesResult;
  isLoopBuilderPreparing: boolean;
  isLoopMutating: boolean;
  isPlaylistMutating: boolean;
  isSavedLibraryMutating: boolean;
  onOpenLoopBuilderForSource: (source: DriveLibrarySource) => void;
  onOpenLoopPlaylistSelector: (loopId: string) => void;
  onOpenPlaylist: (playlistId: string) => void;
  onOpenPlaylistTagEditor: (playlistId: string) => void;
  onDismissSuccessFeedback: () => void;
  onOpenSourcePlaylistSelector: (sourceId: string) => void;
  onOpenSourceTagEditor: (source: DriveLibrarySource) => void;
  onOpenLoopTagEditor: (loopId: string) => void;
  onOpenSuccessFeedbackFolder: (folderId: string) => void;
  onShowSuccessFeedback: (feedback: LibraryFilesSuccessFeedback) => void;
  onQueuePlayableItemNext: (playableItem: PlayableItem) => void;
  onQueuePlayableItemUpNext: (playableItem: PlayableItem) => void;
  onRemoveSource: (source: DriveLibrarySource) => void;
  successFeedback: LibraryFilesSuccessFeedback | null;
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
  authorization,
  canMutateLibrary,
  canMutateLoops,
  canMutatePlaylists,
  canQueueAsNext,
  files,
  isLoopBuilderPreparing,
  isLoopMutating,
  isPlaylistMutating,
  isSavedLibraryMutating,
  onOpenLoopBuilderForSource,
  onOpenLoopPlaylistSelector,
  onOpenPlaylist,
  onOpenPlaylistTagEditor,
  onDismissSuccessFeedback,
  onOpenSourcePlaylistSelector,
  onOpenSourceTagEditor,
  onOpenLoopTagEditor,
  onOpenSuccessFeedbackFolder,
  onShowSuccessFeedback,
  onQueuePlayableItemNext,
  onQueuePlayableItemUpNext,
  onRemoveSource,
  successFeedback,
  onTogglePlayableItemPlayback,
  onToggleSourcePlayback,
}: SavedRehearsalLibraryFilesViewProps) => {
  const explorer = files.explorer;
  const [openMenuRowKey, setOpenMenuRowKey] = useState<string | null>(null);
  const rowActionFlows = useLibraryFilesRowActionFlows({
    authorization,
    canMutateLibrary,
    canMutateLoops,
    canMutatePlaylists,
    canQueueAsNext,
    files,
    isLoopBuilderPreparing,
    isLoopMutating,
    isPlaylistMutating,
    isSavedLibraryMutating,
    onOpenLoopBuilderForSource,
    onOpenLoopPlaylistSelector,
    onOpenLoopTagEditor,
    onOpenPlaylistTagEditor,
    onOpenSourcePlaylistSelector,
    onOpenSourceTagEditor,
    onQueuePlayableItemNext,
    onQueuePlayableItemUpNext,
    onRemoveSource,
    onShowSuccessFeedback,
  });

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
          const menuActions = rowActionFlows.createMenuActions(row);
          const isOptionsVisible = openMenuRowKey === viewModelRow.key;

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
                        setOpenMenuRowKey(viewModelRow.key);
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
                      setOpenMenuRowKey(null);
                      action.onPress();
                    },
                  };
                })}
                isVisible={isOptionsVisible}
                onClose={() => {
                  setOpenMenuRowKey(null);
                }}
                title={resolveFilesRowMenuTitle(row)}
              />
            </View>
          );
        })}
      </ExplorerListSurface>
      {successFeedback ? (
        <View pointerEvents="box-none" style={styles.successFeedbackOverlay}>
          <LibraryFilesSuccessFeedbackCard
            feedback={successFeedback}
            onDismiss={onDismissSuccessFeedback}
            onOpenFolder={onOpenSuccessFeedbackFolder}
          />
        </View>
      ) : null}
      {rowActionFlows.destinationPicker}
      {rowActionFlows.renameDialog}
    </View>
  );
};

const styles = StyleSheet.create({
  rowOverflowTrigger: {
    position: 'relative',
    top: 0,
    right: 0,
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
    position: 'relative',
  },
  successFeedbackOverlay: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    zIndex: 20,
  },
});
