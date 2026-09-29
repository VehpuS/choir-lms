import { useEffect, useState } from 'react';
import { StyleSheet, View } from 'react-native';

import { getLibraryFilesRowNodeKey } from '../../saved-rehearsal-library/library-files-model';
import { AsyncActionStatusCard } from '../async-action-status-card';
import { ExplorerBreadcrumbBar, ExplorerNavigationBar } from '../explorer';
import { OutlinedActionButton } from '../../../components/outlined-action-button';
import { FeedbackCard } from '../feedback-card';
import { FilesExplorerList } from './files-explorer-list';
import type { SavedRehearsalLibraryFilesViewProps } from './files-view-types';
import {
  buildSavedRehearsalLibraryFilesViewModel,
  getFilesPlaylistAddModeCopy,
} from './files-view-model';
import { LibraryFilesSuccessFeedbackCard } from './library-files-success-feedback-card';
import { useLibraryFilesRowActionFlows } from './use-library-files-row-action-flows';

const DISMISS_LABEL = 'Dismiss';

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
  onBlurSuccessFeedback,
  onDismissSuccessFeedback,
  onFocusSuccessFeedback,
  onOpenSourcePlaylistSelector,
  onOpenSourceTagEditor,
  onOpenLoopTagEditor,
  onOpenSuccessFeedbackFolder,
  onShowSuccessFeedback,
  onQueuePlayableItemNext,
  onQueuePlayableItemUpNext,
  onRemoveSource,
  originalLocationActions,
  playback,
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
    sortDirection: searchState.filesSortDirection,
    sortMode: searchState.filesSortMode,
    tagFilterMatchMode: searchState.tagFilterMatchMode,
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
    originalLocationActions,
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
    playback,
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
      {originalLocationActions.pendingSourceLocationAction?.kind ===
      'open-in-google-drive' ? (
        <AsyncActionStatusCard
          message="Confirming this track's current Google Drive folder before continuing…"
          size="compact"
          title="Checking Google Drive"
        />
      ) : null}
      {originalLocationActions.sourceLocationIssue?.kind ===
      'open-in-google-drive' ? (
        <FeedbackCard
          footer={
            <OutlinedActionButton
              label={DISMISS_LABEL}
              onPress={originalLocationActions.clearSourceLocationIssue}
              style={styles.dismissAction}
              variant="accent"
            />
          }
          message={originalLocationActions.sourceLocationIssue.message}
          size="compact"
          title={originalLocationActions.sourceLocationIssue.title}
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
            <OutlinedActionButton
              disabled={activePlaylistAddMode.isPlaylistMutating}
              label="Back to playlist"
              onPress={activePlaylistAddMode.onDone}
              style={styles.playlistAddModeAction}
              variant="accent"
            />
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
        searchQuery={searchState.activeSearchQuery}
        setOpenMenuRowKey={setOpenMenuRowKey}
        viewModel={viewModel}
      />
      {successFeedback ? (
        <View pointerEvents="box-none" style={styles.successFeedbackOverlay}>
          <LibraryFilesSuccessFeedbackCard
            feedback={successFeedback}
            onBlur={onBlurSuccessFeedback}
            onDismiss={onDismissSuccessFeedback}
            onFocus={onFocusSuccessFeedback}
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
  dismissAction: {
    alignSelf: 'flex-start',
  },
  playlistAddModeAction: {
    alignSelf: 'flex-start',
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
