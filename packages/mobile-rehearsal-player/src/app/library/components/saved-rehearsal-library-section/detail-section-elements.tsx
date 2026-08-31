import type { NamedLoop } from '@org/audio-library-models';

import {
  SavedRehearsalLibraryLoopSectionContent,
  SavedRehearsalLibraryPlaylistSectionContent,
  SavedRehearsalLibraryTagDetailSectionContent,
} from './detail-sections';
import type { SavedRehearsalLibrarySectionProps } from './types';
import type { useSavedRehearsalLibrarySectionState } from './use-saved-rehearsal-library-section-state';

type DetailSectionElementsProps = Pick<
  SavedRehearsalLibrarySectionProps,
  | 'activePlayableItem'
  | 'activePlaylistSession'
  | 'canMutateLoops'
  | 'canMutatePlaylists'
  | 'createPlaylist'
  | 'deletePlaylist'
  | 'getCurrentScrollOffsetY'
  | 'isPlaybackPreparing'
  | 'isPlaylistsLoading'
  | 'isSavedLoopsLoading'
  | 'libraryFiles'
  | 'onDetailPlaybackChange'
  | 'onDetailSearchActionsChange'
  | 'pendingLoopId'
  | 'pendingPlaylistId'
  | 'playbackIssue'
  | 'playbackState'
  | 'playlistIssue'
  | 'queuePlayableItemNext'
  | 'queuePlayableItemUpNext'
  | 'removeLoop'
  | 'savedLibrarySources'
  | 'savedLoopIssue'
  | 'savedLoops'
  | 'savedPlaylists'
  | 'selectedTrack'
  | 'setIsPlaylistReorderDragActive'
  | 'setPlaylistReorderDragMoveY'
  | 'toggleActivePlayback'
  | 'toggleItemQueuePlayback'
  | 'togglePlayableItemPlayback'
  | 'togglePlaylistPlayback'
  | 'updatePlaylist'
>;

type DetailSectionElementsState = Pick<
  ReturnType<typeof useSavedRehearsalLibrarySectionState>,
  | 'detailMode'
  | 'isPlaylistMutating'
  | 'loopState'
  | 'playlistState'
  | 'searchState'
  | 'selectedView'
  | 'setIsPlaylistDetailRenameDialogVisible'
  | 'setSelectedView'
  | 'tagDetailState'
  | 'tagEditor'
  | 'trackPlaylistMenu'
>;

// Builds the three per-domain detail-section JSX elements consumed by
// SavedRehearsalLibrarySection's render — colocated with detail-sections.tsx
// since each element is just an assembly of that file's *SectionContent
// components for one domain (loop, playlist, tag) rather than shared logic.
export const buildSavedRehearsalLibraryDetailSectionElements = (options: {
  handleClosePlaylistDetail: () => void;
  handleOpenFilesAddItems: () => void;
  props: DetailSectionElementsProps;
  saveLoopForVisibleContext: (loop: NamedLoop) => Promise<boolean>;
  showLoopBrowseList: boolean;
  state: DetailSectionElementsState;
}) => {
  const {
    handleClosePlaylistDetail,
    handleOpenFilesAddItems,
    props,
    saveLoopForVisibleContext,
    showLoopBrowseList,
    state,
  } = options;
  const {
    detailMode,
    isPlaylistMutating,
    loopState,
    playlistState,
    searchState,
    selectedView,
    setIsPlaylistDetailRenameDialogVisible,
    setSelectedView,
    tagDetailState,
    tagEditor,
    trackPlaylistMenu,
  } = state;

  const loopSection = (
    <SavedRehearsalLibraryLoopSectionContent
      activePlayableItem={props.activePlayableItem}
      canMutateLoops={props.canMutateLoops}
      canMutatePlaylists={props.canMutatePlaylists}
      canQueueAsNext={props.activePlayableItem !== null}
      isBrowseListSuppressed={!showLoopBrowseList}
      isPlaybackPreparing={props.isPlaybackPreparing}
      isPlaylistMutating={isPlaylistMutating}
      isSavedLoopsLoading={props.isSavedLoopsLoading}
      isTrackLoopDetailVisible={detailMode === 'track-loop-detail'}
      loopState={loopState}
      onOpenLoopTagEditor={tagEditor.openLoopTagEditor}
      openLoopPlaylistSelector={trackPlaylistMenu.openLoopPlaylistSelector}
      pendingLoopId={props.pendingLoopId}
      playbackIssue={props.playbackIssue}
      playbackState={props.playbackState}
      queuePlayableItemNext={props.queuePlayableItemNext}
      queuePlayableItemUpNext={props.queuePlayableItemUpNext}
      removeLoop={props.removeLoop}
      savedLibrarySources={props.savedLibrarySources}
      savedLoopIssue={props.savedLoopIssue}
      savedLoops={searchState.visibleSavedLoops}
      saveLoop={saveLoopForVisibleContext}
      searchHighlightQuery={searchState.activeLibrarySearchQuery}
      selectedTrack={props.selectedTrack}
      toggleActivePlayback={props.toggleActivePlayback}
      togglePlayableItemPlayback={props.togglePlayableItemPlayback}
    />
  );
  const playlistSection = (
    <SavedRehearsalLibraryPlaylistSectionContent
      activePlaylistSession={props.activePlaylistSession}
      canMutatePlaylists={props.canMutatePlaylists}
      createPlaylist={props.createPlaylist}
      deletePlaylist={props.deletePlaylist}
      getCurrentScrollOffsetY={props.getCurrentScrollOffsetY}
      isPlaylistDetailMode={detailMode === 'playlist-detail'}
      isPlaylistsLoading={props.isPlaylistsLoading}
      isPlaybackPreparing={props.isPlaybackPreparing}
      onClosePlaylistDetail={handleClosePlaylistDetail}
      onOpenFilesAddItems={handleOpenFilesAddItems}
      onOpenPlaylistTagEditor={tagEditor.openPlaylistTagEditor}
      onRenameDialogVisibilityChange={setIsPlaylistDetailRenameDialogVisible}
      pendingPlaylistId={props.pendingPlaylistId}
      playbackState={props.playbackState}
      playlistIssue={props.playlistIssue}
      playlistState={playlistState}
      savedLibrarySources={props.savedLibrarySources}
      savedLoops={props.savedLoops}
      savedPlaylists={props.savedPlaylists}
      setIsPlaylistReorderDragActive={props.setIsPlaylistReorderDragActive}
      setPlaylistReorderDragMoveY={props.setPlaylistReorderDragMoveY}
      showBrowseHeader={selectedView !== 'playlists'}
      toggleActivePlayback={props.toggleActivePlayback}
      togglePlaylistPlayback={props.togglePlaylistPlayback}
      updatePlaylist={props.updatePlaylist}
    />
  );
  const tagDetailSection = (
    <SavedRehearsalLibraryTagDetailSectionContent
      closeTagDetail={tagDetailState.closeTagDetail}
      fileLinks={props.libraryFiles.fileLinks}
      folders={props.libraryFiles.folders}
      onDetailPlaybackChange={props.onDetailPlaybackChange}
      onDetailSearchActionsChange={props.onDetailSearchActionsChange}
      openFolder={props.libraryFiles.openFolder}
      openPlaylistDetail={playlistState.openPlaylistDetail}
      savedLibrarySources={props.savedLibrarySources}
      savedLoops={props.savedLoops}
      savedPlaylists={props.savedPlaylists}
      setSelectedView={setSelectedView}
      tag={tagDetailState.selectedTag}
      toggleItemQueuePlayback={props.toggleItemQueuePlayback}
    />
  );

  return { loopSection, playlistSection, tagDetailSection };
};
