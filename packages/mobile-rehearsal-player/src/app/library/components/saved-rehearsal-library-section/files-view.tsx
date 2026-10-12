import { useEffect, useMemo, useState } from 'react';
import { StyleSheet, View } from 'react-native';

import { getLibraryFilesRowNodeKey } from '../../saved-rehearsal-library/library-files-model';
import { AsyncActionStatusCard } from '../async-action-status-card';
import { ExplorerBreadcrumbBar, ExplorerNavigationBar } from '../explorer';
import { OutlinedActionButton } from '../../../components/outlined-action-button';
import { FeedbackCard } from '../feedback-card';
import { FilesExplorerList } from './files-explorer-list';
import { SearchNoResults } from './search-no-results';
import { FilesEmptyFolder } from './files-empty-folder';
import { shouldShowEmptyFolder } from './files-empty-folder-model';
import type { SavedRehearsalLibraryFilesViewProps } from './files-view-types';
import {
  buildSavedRehearsalLibraryFilesViewModel,
  getFilesPlaylistAddModeCopy,
} from './files-view-model';
import { useLibraryFilesSelection } from './use-library-files-selection';
import { useLibraryFilesRowActionFlows } from './use-library-files-row-action-flows';

const DISMISS_LABEL = 'Dismiss';
const NO_ROWS: never[] = [];

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
  onEditLoop,
  onOpenLoopBuilderForSource,
  onOpenLoopPlaylistSelector,
  onOpenFolderTagEditor,
  onOpenPlaylistAddItems,
  onOpenPlaylist,
  onOpenPlaylistTagEditor,
  onPlaylistRenameVisibilityChange,
  onOpenSourcePlaylistSelector,
  onOpenSourceTagEditor,
  onOpenLoopTagEditor,
  onShowSuccessFeedback,
  onQueuePlayableItemNext,
  onQueuePlayableItemUpNext,
  onRemoveSource,
  onRemoveLoop,
  onRemovePlaylist,
  onViewTrackLoops,
  originalLocationActions,
  playback,
  playlistAddMode,
  searchState,
  onTogglePlayableItemPlayback,
  onToggleSourcePlayback,
}: SavedRehearsalLibraryFilesViewProps) => {
  const searchOptions = useMemo(
    () => ({
      activeSearchQuery: searchState.activeSearchQuery,
      entityFilter: searchState.entityFilter,
      openedAtByNodeKey: searchState.filesOpenedAtByNodeKey,
      searchScope: searchState.filesSearchScope,
      selectedTagFilters: searchState.selectedTagFilters,
      sortDirection: searchState.filesSortDirection,
      sortMode: searchState.filesSortMode,
      tagFilterMatchMode: searchState.tagFilterMatchMode,
    }),
    [
      searchState.activeSearchQuery,
      searchState.entityFilter,
      searchState.filesOpenedAtByNodeKey,
      searchState.filesSearchScope,
      searchState.filesSortDirection,
      searchState.filesSortMode,
      searchState.selectedTagFilters,
      searchState.tagFilterMatchMode,
    ],
  );
  const explorer = files.resolveExplorerState(searchOptions);
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
    onEditLoop,
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
    onRemoveLoop,
    onRemovePlaylist,
    onViewTrackLoops,
    onShowSuccessFeedback,
    originalLocationActions,
  });

  const selection = useLibraryFilesSelection({
    files,
    rows: explorer?.rows ?? NO_ROWS,
    searchOptions,
  });

  useEffect(() => {
    onPlaylistRenameVisibilityChange?.(rowActionFlows.isRenamingPlaylist);
  }, [onPlaylistRenameVisibilityChange, rowActionFlows.isRenamingPlaylist]);

  if (files.isLoading && !explorer) {
    return (
      <FeedbackCard
        message="Reading the saved library files structure from this device."
        title="Loading files"
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
        trailingAction={selection.entryButton}
      />
      <ExplorerBreadcrumbBar items={viewModel.breadcrumbs} />
      {selection.selectionBar}
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
        selection={{
          getRowSelection: selection.getRowSelection,
          isActive: selection.isActive,
          onOpenFolder: files.openFolder,
        }}
        searchQuery={searchState.activeSearchQuery}
        setOpenMenuRowKey={setOpenMenuRowKey}
        viewModel={viewModel}
      />
      {shouldShowEmptyFolder({
        isSelecting: selection.isActive,
        rowCount: explorer.rows.length,
        searchQuery: searchState.activeSearchQuery,
      }) ? (
        <FilesEmptyFolder />
      ) : null}
      <SearchNoResults
        query={searchState.activeSearchQuery}
        resultCounts={{
          files: explorer.rows.length,
          loops: 0,
          playlists: 0,
          tracks: 0,
        }}
        view="files"
      />
      {selection.bulkNodes}
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
});
