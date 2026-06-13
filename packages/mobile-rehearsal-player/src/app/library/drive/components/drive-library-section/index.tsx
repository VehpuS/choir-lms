import type { DriveAuthorizationState } from '@org/google-drive';
import type { useSavedTrackPlayback } from '../../../playback/hooks/use-saved-track-playback';

import { useSavedRehearsalLibrary } from '../../../hooks/use-saved-rehearsal-library';
import { usePreparedLoopBuilderTrack } from '../../../loops/hooks/use-prepared-loop-builder-track';
import { useSavedLoops } from '../../../loops/hooks/use-saved-loops';
import { getSavedTrackPlaybackStatusCopy } from '../../../playback/utils/saved-track-playback-view-model';
import { useSavedPlaylists } from '../../../playlists/hooks/use-saved-playlists';
import {
  getSavedRehearsalLibrarySourceIssue,
  getSavedRehearsalLibraryStatusCopy,
  resolveSavedRehearsalLibrarySources,
} from '../../../utils/saved-rehearsal-library-view-model';
import { useDriveLibrary } from '../../hooks/use-drive-library';
import { getDriveLibraryStatusCopy } from '../../utils/drive-library-view-model';
import { DriveLibraryContent } from './drive-library-content';
import { resolveDriveLibrarySaveAction } from './saved-source-action';
import { DriveLibrarySavedLibraryPanel } from './saved-library-panel';
import { useDriveLibrarySavedLibraryActions } from './use-drive-library-saved-library-actions';

type SavedTrackPlaybackController = Pick<
  ReturnType<typeof useSavedTrackPlayback>,
  | 'activePlaylistSession'
  | 'activePlayableItem'
  | 'isPreparing'
  | 'issue'
  | 'playbackState'
  | 'progress'
  | 'resolveTrackDuration'
  | 'queuePlayableItemUpNext'
  | 'syncActivePlaylistContext'
  | 'queuePlayableItemNext'
  | 'toggleActivePlayback'
  | 'togglePlayableItemPlayback'
  | 'togglePlaylistPlayback'
  | 'toggleSourcePlayback'
>;

type DriveLibrarySectionProps = {
  authState: DriveAuthorizationState;
  googleAuthConfigured: boolean;
} & SavedTrackPlaybackController;

export const DriveLibrarySection = ({
  activePlaylistSession,
  activePlayableItem,
  authState,
  googleAuthConfigured,
  isPreparing: isPlaybackPreparing,
  issue: playbackIssue,
  playbackState,
  progress,
  resolveTrackDuration,
  syncActivePlaylistContext,
  queuePlayableItemNext,
  queuePlayableItemUpNext,
  toggleActivePlayback,
  togglePlayableItemPlayback,
  togglePlaylistPlayback,
  toggleSourcePlayback,
}: DriveLibrarySectionProps) => {
  const {
    activeSearchQuery,
    browseSnapshot,
    clearSearch,
    currentLocation,
    goToLocation,
    isLoading,
    issue,
    navigationStack,
    openFolder,
    playableSources,
    refresh,
    searchQuery,
    searchSnapshot,
    selectRoot,
    setSearchQuery,
    submitSearch,
    submitSearchQuery,
    recentSearchTerms,
    unavailableSources,
  } = useDriveLibrary(authState);
  const {
    canMutateLibrary,
    isLoading: isSavedLibraryLoading,
    issue: savedLibraryIssue,
    pendingSourceId,
    removeSource,
    savedSources,
    saveResolvedSourceDuration,
    saveSource,
  } = useSavedRehearsalLibrary();
  const {
    canMutateLoops,
    deleteLoop,
    isLoading: isSavedLoopsLoading,
    issue: savedLoopIssue,
    pendingLoopId,
    refreshLoops,
    saveLoop,
    savedLoops,
  } = useSavedLoops();
  const {
    canMutatePlaylists,
    createPlaylist,
    deletePlaylist,
    isLoading: isPlaylistsLoading,
    issue: playlistIssue,
    pendingPlaylistId,
    savedPlaylists,
    updatePlaylist,
  } = useSavedPlaylists();
  const savedLibraryActions = useDriveLibrarySavedLibraryActions({
    deleteLoop,
    refreshLoops,
    removeSource,
    savedLoops,
  });
  const statusCopy = getDriveLibraryStatusCopy({
    authState,
    activeSearchQuery,
    browseSnapshot,
    googleAuthConfigured,
    isLoading,
    issue,
    searchSnapshot,
  });
  const canRefresh = authState.status === 'authorized';
  const isSearchMode = activeSearchQuery !== null;
  const folderTitle =
    currentLocation.rootKind === 'shared' && currentLocation.kind === 'root'
      ? `Shared folders (${browseSnapshot.folders.length})`
      : `Folders (${browseSnapshot.folders.length})`;
  const playableSourceTitle = isSearchMode
    ? `Matching audio (${playableSources.length})`
    : `Audio in ${currentLocation.name} (${playableSources.length})`;
  const unavailableSourceTitle = isSearchMode
    ? `Unavailable or unsupported results (${unavailableSources.length})`
    : `Unavailable or unsupported in ${currentLocation.name} (${unavailableSources.length})`;
  const savedLibrarySources = resolveSavedRehearsalLibrarySources({
    authState,
    savedSources,
    visibleSources: [...playableSources, ...unavailableSources],
  });
  const savedSourceIds = new Set(savedSources.map((source) => source.id));
  const savedLibraryStatusCopy = getSavedRehearsalLibraryStatusCopy({
    authState,
    isLoading: isSavedLibraryLoading,
    issue: savedLibraryIssue,
    savedSources: savedLibrarySources,
  });
  const savedTrackPlaybackStatusCopy = getSavedTrackPlaybackStatusCopy({
    activePlayableItem,
    durationSeconds: progress.duration,
    isPreparing: isPlaybackPreparing,
    issue: playbackIssue,
    playbackState,
    positionSeconds: progress.position,
  });
  const isSavedLibraryMutating = pendingSourceId !== null;
  const {
    pendingSourceId: pendingLoopBuilderSourceId,
    prepareLoopBuilderTrack,
    selectedTrack: selectedLoopTrack,
  } = usePreparedLoopBuilderTrack({
    activePlayableItem,
    authState,
    playbackDurationSeconds: progress.duration,
    persistResolvedSourceDuration: saveResolvedSourceDuration,
    resolveTrackDuration,
    savedSources: savedLibrarySources,
    selectedSourceId: savedLibraryActions.selectedLoopSourceId,
  });

  const openLoopBuilderForSource = (
    source: (typeof savedLibrarySources)[number],
  ) => {
    void (async () => {
      await prepareLoopBuilderTrack(source);
      savedLibraryActions.setSelectedLoopSourceId(source.id);
    })();
  };

  return (
    <DriveLibraryContent
      canRefresh={canRefresh}
      currentRootKind={currentLocation.rootKind}
      folderTitle={folderTitle}
      folders={browseSnapshot.folders}
      getPlayableSourceAction={(source) => {
        const isSaved = savedSourceIds.has(source.id);

        if (isSaved) {
          return resolveDriveLibrarySaveAction({
            canMutateLibrary,
            isSavedLibraryLoading:
              isSavedLibraryLoading || isSavedLibraryMutating,
            onRemove: () => {
              savedLibraryActions.confirmRemoveSource(source);
            },
            pendingSourceId,
            source,
          });
        }

        return {
          disabled:
            !canMutateLibrary ||
            isSavedLibraryLoading ||
            isSavedLibraryMutating,
          label: pendingSourceId === source.id ? 'Saving…' : 'Save',
          onPress: () => {
            void saveSource(source);
          },
          placement: 'inline' as const,
        };
      }}
      getPlayableSourceMessage={(source) => {
        return getSavedRehearsalLibrarySourceIssue(
          savedLibraryIssue,
          source,
          'save',
        );
      }}
      goToLocation={goToLocation}
      isLoading={isLoading}
      isSearchMode={isSearchMode}
      navigationStack={navigationStack}
      onClearSearch={clearSearch}
      onOpenFolder={openFolder}
      onRefresh={refresh}
      onSearch={submitSearch}
      onSearchQueryChange={setSearchQuery}
      onSelectRecentSearchTerm={submitSearchQuery}
      onSelectRoot={selectRoot}
      playableSourceTitle={playableSourceTitle}
      playableSources={playableSources}
      recentSearchTerms={recentSearchTerms}
      savedLibraryPanel={
        <DriveLibrarySavedLibraryPanel
          openLoopBuilderForSource={openLoopBuilderForSource}
          playback={{
            activePlayableItem,
            activePlaylistSession,
            isPreparing: isPlaybackPreparing,
            issue: playbackIssue,
            playbackState,
            progress,
            queuePlayableItemNext,
            queuePlayableItemUpNext,
            syncActivePlaylistContext,
            toggleActivePlayback,
            togglePlayableItemPlayback,
            togglePlaylistPlayback,
            toggleSourcePlayback,
          }}
          preparedLoopBuilderTrack={{
            pendingSourceId: pendingLoopBuilderSourceId,
            prepareLoopBuilderTrack,
            selectedTrack: selectedLoopTrack,
          }}
          savedLibraryActions={savedLibraryActions}
          savedLibrarySources={savedLibrarySources}
          savedLibraryState={{
            canMutateLibrary,
            isLoading: isSavedLibraryLoading,
            issue: savedLibraryIssue,
            pendingSourceId,
            removeSource,
            savedSources,
            saveResolvedSourceDuration,
            saveSource,
          }}
          savedLibraryStatusCopy={savedLibraryStatusCopy}
          savedLoopsState={{
            canMutateLoops,
            deleteLoop,
            isLoading: isSavedLoopsLoading,
            issue: savedLoopIssue,
            pendingLoopId,
            refreshLoops,
            saveLoop,
            savedLoops,
          }}
          savedPlaylistsState={{
            canMutatePlaylists,
            createPlaylist,
            deletePlaylist,
            isLoading: isPlaylistsLoading,
            issue: playlistIssue,
            pendingPlaylistId,
            savedPlaylists,
            updatePlaylist,
          }}
          savedTrackPlaybackStatusCopy={savedTrackPlaybackStatusCopy}
        />
      }
      searchQuery={searchQuery}
      statusCopy={statusCopy}
      unavailableSourceTitle={unavailableSourceTitle}
      unavailableSources={unavailableSources}
    />
  );
};
