import { type NamedLoop, type Playlist } from '@org/audio-library-models';

import type { DriveLibrarySource } from '../../drive/utils/drive-library-view-model';
import { SavedLoopSection } from '../../loops/components/saved-loop-section';
import type { SavedLoopIssue } from '../../loops/utils/saved-loop-view-model';
import type {
  SavedTrackPlaybackIssue,
  SavedTrackPlaybackState,
} from '../../playback/utils/saved-track-playback-view-model';
import { SavedPlaylistSection } from '../../playlists/components/saved-playlist-section';
import type { PlaylistPlaybackSession } from '../../playlists/utils/saved-playlist-playback-view-model';
import type { SavedPlaylistIssue } from '../../playlists/utils/saved-playlist-view-model';
import { getPlaylistDetailEmptyStateCopy } from './playlist-detail-origin';
import type { SavedRehearsalLibrarySectionProps } from './types';
import { useSavedRehearsalLibraryLoopState } from './use-saved-rehearsal-library-loop-state';
import { useSavedRehearsalLibraryPlaylistState } from './use-saved-rehearsal-library-playlist-state';

type SavedRehearsalLibraryLoopSectionContentProps = {
  activePlayableItem: SavedRehearsalLibrarySectionProps['activePlayableItem'];
  canMutateLoops: boolean;
  canMutatePlaylists: boolean;
  canQueueAsNext: boolean;
  isPlaybackPreparing: boolean;
  isPlaylistMutating: boolean;
  isSavedLoopsLoading: boolean;
  isTrackLoopDetailVisible: boolean;
  loopState: ReturnType<typeof useSavedRehearsalLibraryLoopState>;
  onOpenLoopTagEditor: (
    loop: Parameters<typeof SavedLoopSection>[0]['savedLoops'][number],
  ) => void;
  openLoopPlaylistSelector: (loopId: string) => void;
  pendingLoopId: string | null;
  playbackIssue: SavedTrackPlaybackIssue | null;
  playbackState: SavedTrackPlaybackState | undefined;
  queuePlayableItemNext: SavedRehearsalLibrarySectionProps['queuePlayableItemNext'];
  queuePlayableItemUpNext: SavedRehearsalLibrarySectionProps['queuePlayableItemUpNext'];
  removeLoop: (loop: NamedLoop) => void;
  savedLibrarySources: DriveLibrarySource[];
  savedLoopIssue: SavedLoopIssue | null;
  savedLoops: NamedLoop[];
  saveLoop: (loop: NamedLoop) => Promise<boolean>;
  searchHighlightQuery: string | null;
  selectedTrack: SavedRehearsalLibrarySectionProps['selectedTrack'];
  toggleActivePlayback: () => Promise<void>;
  togglePlayableItemPlayback: SavedRehearsalLibrarySectionProps['togglePlayableItemPlayback'];
};

export const SavedRehearsalLibraryLoopSectionContent = ({
  activePlayableItem,
  canMutateLoops,
  canMutatePlaylists,
  canQueueAsNext,
  isPlaybackPreparing,
  isPlaylistMutating,
  isSavedLoopsLoading,
  isTrackLoopDetailVisible,
  loopState,
  onOpenLoopTagEditor,
  openLoopPlaylistSelector,
  pendingLoopId,
  playbackIssue,
  playbackState,
  queuePlayableItemNext,
  queuePlayableItemUpNext,
  removeLoop,
  savedLibrarySources,
  savedLoopIssue,
  savedLoops,
  saveLoop,
  searchHighlightQuery,
  selectedTrack,
  toggleActivePlayback,
  togglePlayableItemPlayback,
}: SavedRehearsalLibraryLoopSectionContentProps) => {
  return (
    <SavedLoopSection
      activePlayableItem={activePlayableItem}
      canMutateLoops={canMutateLoops}
      canMutatePlaylists={canMutatePlaylists}
      canQueueAsNext={canQueueAsNext}
      editingLoop={loopState.selectedLoopEdit}
      highlightQuery={searchHighlightQuery}
      isPlaybackPreparing={isPlaybackPreparing}
      isPlaylistMutating={isPlaylistMutating}
      isSavedLoopsLoading={isSavedLoopsLoading}
      isTrackLoopDetailVisible={isTrackLoopDetailVisible}
      onCloseLoopBuilder={loopState.closeLoopBuilder}
      onEditLoop={loopState.openLoopEditor}
      onEditLoopTags={onOpenLoopTagEditor}
      onOpenLoopPlaylistSelector={openLoopPlaylistSelector}
      pendingLoopId={pendingLoopId}
      playbackIssue={playbackIssue}
      playbackState={playbackState}
      queuePlayableItemNext={queuePlayableItemNext}
      queuePlayableItemUpNext={queuePlayableItemUpNext}
      removeLoop={removeLoop}
      savedLoopIssue={savedLoopIssue}
      savedLoops={savedLoops}
      savedSources={savedLibrarySources}
      saveLoop={saveLoop}
      selectedTrack={selectedTrack}
      toggleActivePlayback={toggleActivePlayback}
      togglePlayableItemPlayback={togglePlayableItemPlayback}
      trackLoopView={isTrackLoopDetailVisible ? loopState.trackLoopView : null}
    />
  );
};

type SavedRehearsalLibraryPlaylistSectionContentProps = {
  activePlaylistSession: PlaylistPlaybackSession | null;
  canMutatePlaylists: boolean;
  createPlaylist: (playlist: Playlist) => Promise<Playlist | null>;
  deletePlaylist: (playlist: Playlist) => Promise<boolean>;
  getCurrentScrollOffsetY: () => number;
  isPlaylistsLoading: boolean;
  isPlaybackPreparing: boolean;
  isPlaylistDetailMode: boolean;
  onClosePlaylistDetail: () => void;
  onOpenFilesAddItemsFromEmptyState: () => void;
  onOpenPlaylistTagEditor: (playlistId: string) => void;
  pendingPlaylistId: string | null;
  playbackState: SavedTrackPlaybackState | undefined;
  playlistIssue: SavedPlaylistIssue | null;
  playlistState: ReturnType<typeof useSavedRehearsalLibraryPlaylistState>;
  savedLibrarySources: DriveLibrarySource[];
  savedLoops: NamedLoop[];
  savedPlaylists: Playlist[];
  setIsPlaylistReorderDragActive: (isActive: boolean) => void;
  setPlaylistReorderDragMoveY: (moveY: number) => void;
  toggleActivePlayback: () => Promise<void>;
  togglePlaylistPlayback: SavedRehearsalLibrarySectionProps['togglePlaylistPlayback'];
  updatePlaylist: (playlist: Playlist) => Promise<Playlist | null>;
};

export const SavedRehearsalLibraryPlaylistSectionContent = ({
  activePlaylistSession,
  canMutatePlaylists,
  createPlaylist,
  deletePlaylist,
  getCurrentScrollOffsetY,
  isPlaylistsLoading,
  isPlaybackPreparing,
  isPlaylistDetailMode,
  onClosePlaylistDetail,
  onOpenFilesAddItemsFromEmptyState,
  onOpenPlaylistTagEditor,
  pendingPlaylistId,
  playbackState,
  playlistIssue,
  playlistState,
  savedLibrarySources,
  savedLoops,
  savedPlaylists,
  setIsPlaylistReorderDragActive,
  setPlaylistReorderDragMoveY,
  toggleActivePlayback,
  togglePlaylistPlayback,
  updatePlaylist,
}: SavedRehearsalLibraryPlaylistSectionContentProps) => {
  const detailEmptyStateCopy = getPlaylistDetailEmptyStateCopy(
    playlistState.playlistDetailOrigin,
  );

  return (
    <SavedPlaylistSection
      activePlaylistSession={activePlaylistSession}
      canMutatePlaylists={canMutatePlaylists}
      createPlaylist={createPlaylist}
      deletePlaylist={deletePlaylist}
      detailEmptyStateActionLabel={detailEmptyStateCopy.actionLabel}
      detailEmptyStateMessage={detailEmptyStateCopy.message}
      getCurrentScrollOffsetY={getCurrentScrollOffsetY}
      isDetailVisible={isPlaylistDetailMode}
      isLoading={isPlaylistsLoading}
      isPlaybackPreparing={isPlaybackPreparing}
      issue={playlistIssue}
      onAddItemsFromEmptyState={
        playlistState.playlistDetailOrigin?.view === 'files'
          ? onOpenFilesAddItemsFromEmptyState
          : undefined
      }
      onCloseDetail={onClosePlaylistDetail}
      onEditPlaylistTags={onOpenPlaylistTagEditor}
      pendingPlaylistId={pendingPlaylistId}
      playbackState={playbackState}
      savedLoops={savedLoops}
      savedPlaylists={savedPlaylists}
      savedSources={savedLibrarySources}
      selectedPlaylist={playlistState.selectedPlaylist}
      setIsReorderDragActive={setIsPlaylistReorderDragActive}
      setReorderDragMoveY={setPlaylistReorderDragMoveY}
      setSelectedPlaylistId={playlistState.setSelectedPlaylistId}
      toggleActivePlayback={toggleActivePlayback}
      togglePlaylistPlayback={togglePlaylistPlayback}
      updatePlaylist={updatePlaylist}
    />
  );
};
