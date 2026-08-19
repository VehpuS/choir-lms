import { useEffect, useState } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';

import type {
  PlayableItem,
  RehearsalLibraryFolderNode,
} from '@org/audio-library-models';

import type { DriveSessionMenuController } from '../../../auth/google-drive/components/drive-session-menu/drive-session-menu-controller';
import {
  buttonInteractionGuardStyle,
  interactionGuardProps,
} from '../../../components/interaction-guard';
import type { DriveLibrarySource } from '../../drive/utils/drive-library-view-model';
import {
  getLibraryFilesRowNodeKey,
  type LibraryFilesSearchScope,
  type LibraryFilesSortMode,
} from '../../saved-rehearsal-library/library-files-model';
import type { UseLibraryFilesResult } from '../../saved-rehearsal-library/use-library-files';
import type { LibrarySearchEntityFilter } from '../../search/utils/saved-library-search-view-model';
import { ExplorerBreadcrumbBar, ExplorerNavigationBar } from '../explorer';
import { FeedbackCard } from '../feedback-card';
import { FilesExplorerList } from './files-explorer-list';
import {
  buildSavedRehearsalLibraryFilesViewModel,
  getFilesPlaylistAddModeCopy,
  type FilesPlaylistAddMode,
} from './files-view-model';
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
  pendingLoopBuilderSourceId: string | null;
  onOpenLoopBuilderForSource: (source: DriveLibrarySource) => void;
  onOpenLoopPlaylistSelector: (loopId: string) => void;
  onOpenFolderTagEditor: (folder: RehearsalLibraryFolderNode) => void;
  onOpenPlaylistAddItems: (playlistId: string) => void;
  onOpenPlaylist: (playlistId: string) => void;
  onOpenPlaylistTagEditor: (playlistId: string) => void;
  onPlaylistRenameVisibilityChange?: (isVisible: boolean) => void;
  onDismissSuccessFeedback: () => void;
  onOpenSourcePlaylistSelector: (sourceId: string) => void;
  onOpenSourceTagEditor: (source: DriveLibrarySource) => void;
  onOpenLoopTagEditor: (loopId: string) => void;
  onOpenSuccessFeedbackFolder: (folderId: string) => void;
  onShowSuccessFeedback: (feedback: LibraryFilesSuccessFeedback) => void;
  onQueuePlayableItemNext: (playableItem: PlayableItem) => void;
  onQueuePlayableItemUpNext: (playableItem: PlayableItem) => void;
  onRemoveSource: (source: DriveLibrarySource) => void;
  playlistAddMode?: FilesPlaylistAddMode;
  searchState: {
    activeSearchQuery: string | null;
    entityFilter: LibrarySearchEntityFilter;
    filesOpenedAtByNodeKey: Readonly<Record<string, string>>;
    filesSearchScope: LibraryFilesSearchScope;
    filesSortMode: LibraryFilesSortMode;
    recordFilesEntryOpened: (nodeKey: string) => void;
    selectedTagFilters: string[];
  };
  successFeedback: LibraryFilesSuccessFeedback | null;
  onTogglePlayableItemPlayback: (playableItem: PlayableItem) => Promise<void>;
  onToggleSourcePlayback: (source: DriveLibrarySource) => Promise<void>;
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
  pendingLoopBuilderSourceId,
  onOpenLoopBuilderForSource,
  onOpenLoopPlaylistSelector,
  onOpenFolderTagEditor,
  onOpenPlaylistAddItems,
  onOpenPlaylist,
  onOpenPlaylistTagEditor,
  onPlaylistRenameVisibilityChange,
  onDismissSuccessFeedback,
  onOpenSourcePlaylistSelector,
  onOpenSourceTagEditor,
  onOpenLoopTagEditor,
  onOpenSuccessFeedbackFolder,
  onShowSuccessFeedback,
  onQueuePlayableItemNext,
  onQueuePlayableItemUpNext,
  onRemoveSource,
  playlistAddMode,
  searchState,
  successFeedback,
  onTogglePlayableItemPlayback,
  onToggleSourcePlayback,
}: SavedRehearsalLibraryFilesViewProps) => {
  const explorer = files.resolveExplorerState({
    activeSearchQuery: searchState.activeSearchQuery,
    entityFilter: searchState.entityFilter,
    openedAtByNodeKey: searchState.filesOpenedAtByNodeKey,
    searchScope: searchState.filesSearchScope,
    selectedTagFilters: searchState.selectedTagFilters,
    sortMode: searchState.filesSortMode,
  });
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
    pendingLoopBuilderSourceId,
    onOpenLoopBuilderForSource,
    onOpenLoopPlaylistSelector,
    onOpenLoopTagEditor,
    onOpenFolderTagEditor,
    onOpenPlaylistAddItems,
    onOpenPlaylistTagEditor,
    onOpenSourcePlaylistSelector,
    onOpenSourceTagEditor,
    onQueuePlayableItemNext,
    onQueuePlayableItemUpNext,
    onRemoveSource,
    onShowSuccessFeedback,
  });

  useEffect(() => {
    onPlaylistRenameVisibilityChange?.(rowActionFlows.isRenamingPlaylist);
  }, [onPlaylistRenameVisibilityChange, rowActionFlows.isRenamingPlaylist]);

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
    explorer,
    files,
    onOpenPlaylist,
    pendingLoopBuilderSourceId,
    onOpenRow: (row) => {
      searchState.recordFilesEntryOpened(getLibraryFilesRowNodeKey(row));
    },
    onTogglePlayableItemPlayback,
    onToggleSourcePlayback,
    playlistAddMode,
  });

  const activePlaylistAddMode = playlistAddMode ?? null;
  const playlistAddModeCopy = activePlaylistAddMode
    ? getFilesPlaylistAddModeCopy({
        currentFolderName: viewModel.currentFolderName,
        playlistName: activePlaylistAddMode.playlistName,
      })
    : null;

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
      {playlistAddModeCopy && activePlaylistAddMode ? (
        <FeedbackCard
          footer={
            <View style={styles.playlistAddModeActions}>
              <Pressable
                accessibilityRole="button"
                {...interactionGuardProps}
                disabled={activePlaylistAddMode.isPlaylistMutating}
                onPress={activePlaylistAddMode.onDone}
                style={({ pressed }) => [
                  styles.playlistAddModePrimaryAction,
                  buttonInteractionGuardStyle,
                  pressed && !activePlaylistAddMode.isPlaylistMutating
                    ? styles.playlistAddModePrimaryActionPressed
                    : undefined,
                  activePlaylistAddMode.isPlaylistMutating
                    ? styles.playlistAddModePrimaryActionDisabled
                    : undefined,
                ]}
              >
                <Text style={styles.playlistAddModePrimaryActionLabel}>
                  Back to playlist
                </Text>
              </Pressable>
            </View>
          }
          message={playlistAddModeCopy.message}
          size="compact"
          title={playlistAddModeCopy.title}
          tone="ready"
        />
      ) : null}
      <FilesExplorerList
        createMenuActions={rowActionFlows.createMenuActions}
        openMenuRowKey={openMenuRowKey}
        rows={explorer.rows}
        setOpenMenuRowKey={setOpenMenuRowKey}
        viewModel={viewModel}
      />
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
  playlistAddModeActions: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  playlistAddModePrimaryAction: {
    borderRadius: 999,
    backgroundColor: '#1f5c40',
    paddingHorizontal: 12,
    paddingVertical: 8,
  },
  playlistAddModePrimaryActionDisabled: {
    opacity: 0.55,
  },
  playlistAddModePrimaryActionLabel: {
    color: '#f8fbf7',
    fontSize: 13,
    fontWeight: '700',
  },
  playlistAddModePrimaryActionPressed: {
    opacity: 0.88,
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
