import { shouldRenderFilesLoopBuilder } from './browse-content-model';
import type { SavedRehearsalLibraryBrowseContentProps } from './browse-content-types';
import { BrowsePlaylistCards } from './browse-playlist-cards';
import { BrowseSourceGroup } from './browse-source-group';
import { SavedRehearsalLibraryFilesView } from './files-view';

export const SavedRehearsalLibraryBrowseContent = ({
  activePlayableItem,
  authorization,
  canMutateLibrary,
  canMutateLoops,
  canMutatePlaylists,
  canQueueAsNext,
  libraryFiles,
  isLoopMutating,
  isPlaybackPreparing,
  isPlaylistMutating,
  isSavedLibraryMutating,
  loopSection,
  loopState,
  openLoopBuilderForSource,
  pendingLoopBuilderSourceId,
  pendingSourceId,
  playbackIssue,
  playbackState,
  playlistSection,
  playlistState,
  queuePlayableItemNext,
  queuePlayableItemUpNext,
  removeSource,
  savedLibraryIssue,
  savedLibrarySources,
  savedLoops,
  savedPlaylists,
  selectedTrack,
  selectedView,
  savedSourceTitle,
  searchState,
  visibleSections,
  onOpenPlaylistTagEditor,
  onOpenLoopTagEditor,
  onOpenSourceTagEditor,
  togglePlaylistPlayback,
  togglePlayableItemPlayback,
  toggleSourcePlayback,
  trackPlaylistMenu,
}: SavedRehearsalLibraryBrowseContentProps) => {
  const playlistDetailOpenContext =
    selectedView === 'files'
      ? {
          originFilesFolderId: libraryFiles.explorer?.currentFolder.id ?? null,
          originView: selectedView,
        }
      : {
          originView: selectedView,
        };

  const shouldRenderLoopSectionInFiles = shouldRenderFilesLoopBuilder({
    activeLibrarySearchQuery: searchState.activeLibrarySearchQuery,
    selectedTrack,
    selectedView,
  });

  if (selectedView === 'files' && !searchState.activeLibrarySearchQuery) {
    return (
      <>
        <SavedRehearsalLibraryFilesView
          activePlayableItem={activePlayableItem}
          authorization={authorization}
          canMutateLibrary={canMutateLibrary}
          canMutateLoops={canMutateLoops}
          canMutatePlaylists={canMutatePlaylists}
          canQueueAsNext={canQueueAsNext}
          files={libraryFiles}
          isLoopBuilderPreparing={pendingLoopBuilderSourceId !== null}
          isLoopMutating={isLoopMutating}
          isPlaylistMutating={isPlaylistMutating}
          isSavedLibraryMutating={isSavedLibraryMutating}
          onOpenLoopBuilderForSource={openLoopBuilderForSource}
          onOpenLoopPlaylistSelector={
            trackPlaylistMenu.openLoopPlaylistSelector
          }
          onOpenPlaylist={(playlistId) => {
            playlistState.openPlaylistDetail(
              playlistId,
              playlistDetailOpenContext,
            );
          }}
          onOpenPlaylistTagEditor={onOpenPlaylistTagEditor}
          onOpenSourcePlaylistSelector={
            trackPlaylistMenu.openSourcePlaylistSelector
          }
          onOpenSourceTagEditor={onOpenSourceTagEditor}
          onOpenLoopTagEditor={(loopId) => {
            const loop = savedLoops.find((currentLoop) => {
              return currentLoop.id === loopId;
            });

            if (!loop) {
              return;
            }

            onOpenLoopTagEditor(loop);
          }}
          onQueuePlayableItemNext={queuePlayableItemNext}
          onQueuePlayableItemUpNext={queuePlayableItemUpNext}
          onRemoveSource={removeSource}
          onTogglePlayableItemPlayback={togglePlayableItemPlayback}
          onToggleSourcePlayback={toggleSourcePlayback}
        />
        {shouldRenderLoopSectionInFiles ? loopSection : null}
      </>
    );
  }

  return (
    <>
      {visibleSections.showPlaylistCards ? (
        <BrowsePlaylistCards
          canMutatePlaylists={canMutatePlaylists}
          isPlaylistMutating={isPlaylistMutating}
          loops={savedLoops}
          onOpenPlaylistTagEditor={onOpenPlaylistTagEditor}
          openPlaylist={(playlistId) => {
            playlistState.openPlaylistDetail(
              playlistId,
              playlistDetailOpenContext,
            );
          }}
          playlistCards={searchState.visiblePlaylistCards}
          playlistState={playlistState}
          savedLibrarySources={savedLibrarySources}
          savedPlaylists={savedPlaylists}
          searchQuery={searchState.activeLibrarySearchQuery}
          togglePlaylistPlayback={togglePlaylistPlayback}
        />
      ) : null}
      {visibleSections.showSourceGroup ? (
        <BrowseSourceGroup
          activePlayableItem={activePlayableItem}
          canMutateLibrary={canMutateLibrary}
          canMutateLoops={canMutateLoops}
          canMutatePlaylists={canMutatePlaylists}
          canQueueAsNext={canQueueAsNext}
          isLoopMutating={isLoopMutating}
          isPlaybackPreparing={isPlaybackPreparing}
          isPlaylistMutating={isPlaylistMutating}
          isSavedLibraryMutating={isSavedLibraryMutating}
          onOpenLoopBuilderForSource={openLoopBuilderForSource}
          onOpenSourceTagEditor={onOpenSourceTagEditor}
          openSourcePlaylistSelector={
            trackPlaylistMenu.openSourcePlaylistSelector
          }
          openTrackLoopView={loopState.openTrackLoopView}
          pendingLoopBuilderSourceId={pendingLoopBuilderSourceId}
          pendingSourceId={pendingSourceId}
          playbackIssue={playbackIssue}
          playbackState={playbackState}
          queuePlayableItemNext={queuePlayableItemNext}
          queuePlayableItemUpNext={queuePlayableItemUpNext}
          removeSource={removeSource}
          savedLibraryIssue={savedLibraryIssue}
          savedLoops={savedLoops}
          savedSourceTitle={savedSourceTitle}
          searchQuery={searchState.activeLibrarySearchQuery}
          sources={searchState.visibleSavedLibrarySources}
          toggleSourcePlayback={toggleSourcePlayback}
        />
      ) : null}
      {visibleSections.showLoopSection ? loopSection : null}
      {visibleSections.showPlaylistSection ? playlistSection : null}
    </>
  );
};
