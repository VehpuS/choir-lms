import { type ComponentProps } from 'react';
import type { useSavedTrackPlayback } from '../../../playback/hooks/use-saved-track-playback';

import { SavedRehearsalLibrarySection } from '../../../components/saved-rehearsal-library-section';
import { usePreparedLoopBuilderTrack } from '../../../loops/hooks/use-prepared-loop-builder-track';
import { useSavedLoops } from '../../../loops/hooks/use-saved-loops';
import { useSavedPlaylists } from '../../../playlists/hooks/use-saved-playlists';
import { useLibraryFiles } from '../../../saved-rehearsal-library/use-library-files';
import { useSavedRehearsalLibrary } from '../../../saved-rehearsal-library/use-saved-rehearsal-library';
import { type DriveLibrarySource } from '../../utils/drive-library-view-model';
import { useDriveLibrarySavedLibraryActions } from './use-drive-library-saved-library-actions';

type PlaybackController = Pick<
  ReturnType<typeof useSavedTrackPlayback>,
  | 'activePlayableItem'
  | 'activePlaylistSession'
  | 'isPreparing'
  | 'issue'
  | 'playbackState'
  | 'progress'
  | 'queuePlayableItemNext'
  | 'queuePlayableItemUpNext'
  | 'syncActivePlaylistContext'
  | 'toggleActivePlayback'
  | 'togglePlayableItemPlayback'
  | 'togglePlaylistPlayback'
  | 'toggleSourcePlayback'
>;

type SavedLibrarySectionProps = ComponentProps<
  typeof SavedRehearsalLibrarySection
>;

type DriveLibrarySavedLibraryPanelProps = {
  openLoopBuilderForSource: (source: DriveLibrarySource) => void;
  playback: PlaybackController;
  preparedLoopBuilderTrack: ReturnType<typeof usePreparedLoopBuilderTrack>;
  savedLibraryActions: ReturnType<typeof useDriveLibrarySavedLibraryActions>;
  savedLibrarySources: DriveLibrarySource[];
  savedLibraryState: ReturnType<typeof useSavedRehearsalLibrary>;
  savedLibraryStatusCopy: SavedLibrarySectionProps['savedLibraryStatusCopy'];
  savedLoopsState: ReturnType<typeof useSavedLoops>;
  savedPlaylistsState: ReturnType<typeof useSavedPlaylists>;
  savedTrackPlaybackStatusCopy: SavedLibrarySectionProps['savedTrackPlaybackStatusCopy'];
};

export const DriveLibrarySavedLibraryPanel = ({
  openLoopBuilderForSource,
  playback,
  preparedLoopBuilderTrack,
  savedLibraryActions,
  savedLibrarySources,
  savedLibraryState,
  savedLibraryStatusCopy,
  savedLoopsState,
  savedPlaylistsState,
  savedTrackPlaybackStatusCopy,
}: DriveLibrarySavedLibraryPanelProps) => {
  const libraryFiles = useLibraryFiles({
    refreshSavedLoops: savedLoopsState.refreshLoops,
    refreshSavedPlaylists: savedPlaylistsState.refreshPlaylists,
    refreshSavedSources: savedLibraryState.refreshSources,
    savedLoops: savedLoopsState.savedLoops,
    savedPlaylists: savedPlaylistsState.savedPlaylists,
    savedSources: savedLibrarySources,
  });

  return (
    <SavedRehearsalLibrarySection
      activePlayableItem={playback.activePlayableItem}
      activePlaylistSession={playback.activePlaylistSession}
      canMutateLibrary={savedLibraryState.canMutateLibrary}
      canMutateLoops={savedLoopsState.canMutateLoops}
      canMutatePlaylists={savedPlaylistsState.canMutatePlaylists}
      createPlaylist={savedPlaylistsState.createPlaylist}
      deletePlaylist={savedPlaylistsState.deletePlaylist}
      getCurrentScrollOffsetY={() => {
        return 0;
      }}
      isPlaybackPreparing={playback.isPreparing}
      isPlaylistsLoading={savedPlaylistsState.isLoading}
      isSavedLibraryLoading={savedLibraryState.isLoading}
      isSavedLoopsLoading={savedLoopsState.isLoading}
      libraryFiles={libraryFiles}
      libraryFilesSuccessFeedback={null}
      openLoopBuilderForSource={openLoopBuilderForSource}
      onDismissLibraryFilesSuccessFeedback={() => undefined}
      onOpenLibraryFilesSuccessFeedbackFolder={() => undefined}
      onSelectTag={() => undefined}
      onShowLibraryFilesSuccessFeedback={() => undefined}
      pendingLoopBuilderSourceId={preparedLoopBuilderTrack.pendingSourceId}
      pendingLoopId={savedLoopsState.pendingLoopId}
      pendingPlaylistId={savedPlaylistsState.pendingPlaylistId}
      pendingSourceId={savedLibraryState.pendingSourceId}
      playbackIssue={playback.issue}
      playbackState={playback.playbackState}
      playlistIssue={savedPlaylistsState.issue}
      queuePlayableItemNext={playback.queuePlayableItemNext}
      queuePlayableItemUpNext={playback.queuePlayableItemUpNext}
      removeLoop={savedLibraryActions.confirmRemoveLoop}
      removeSource={savedLibraryActions.confirmRemoveSource}
      savedLibraryIssue={savedLibraryState.issue}
      savedLibrarySources={savedLibrarySources}
      savedLibraryStatusCopy={savedLibraryStatusCopy}
      savedLoopIssue={savedLoopsState.issue}
      savedLoops={savedLoopsState.savedLoops}
      savedPlaylists={savedPlaylistsState.savedPlaylists}
      savedTrackPlaybackStatusCopy={savedTrackPlaybackStatusCopy}
      saveLoop={savedLoopsState.saveLoop}
      saveSource={savedLibraryState.saveSource}
      selectedTrack={preparedLoopBuilderTrack.selectedTrack}
      setIsPlaylistReorderDragActive={() => undefined}
      setPlaylistReorderDragMoveY={() => undefined}
      setSelectedLoopSourceId={savedLibraryActions.setSelectedLoopSourceId}
      syncActivePlaylistContext={playback.syncActivePlaylistContext}
      toggleActivePlayback={playback.toggleActivePlayback}
      togglePlayableItemPlayback={playback.togglePlayableItemPlayback}
      togglePlaylistPlayback={playback.togglePlaylistPlayback}
      toggleSourcePlayback={playback.toggleSourcePlayback}
      updatePlaylist={savedPlaylistsState.updatePlaylist}
    />
  );
};
