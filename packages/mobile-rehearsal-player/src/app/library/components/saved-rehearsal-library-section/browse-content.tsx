import { aggregateRehearsalLibraryTags } from '@org/audio-library-runtime';
import { cloneElement, useMemo } from 'react';

import { SavedTagsList } from '../../tags/components/saved-tags-list';
import {
  shouldRenderFilesExplorer,
  shouldRenderFilesLoopBuilder,
  shouldRenderSavedTagsList,
} from './browse-content-model';
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
  libraryFilesSuccessFeedback,
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
  onDoneAddingFilesPlaylistItems,
  onOpenFilesAddItemsForPlaylist,
  onDismissLibraryFilesSuccessFeedback,
  onOpenFolderTagEditor,
  onOpenLibraryFilesSuccessFeedbackFolder,
  onOpenPlaylistTagEditor,
  onPlaylistRenameVisibilityChange,
  onOpenLoopTagEditor,
  onOpenSourceTagEditor,
  onSelectTag,
  onShowLibraryFilesSuccessFeedback,
  togglePlaylistPlayback,
  togglePlayableItemPlayback,
  toggleSourcePlayback,
  trackPlaylistMenu,
}: SavedRehearsalLibraryBrowseContentProps) => {
  const playlistDetailOpenContext =
    selectedView === 'files'
      ? {
          originFilesFolderId: libraryFiles.explorer?.currentFolder.id ?? null,
          originFilesFolderName:
            libraryFiles.explorer?.currentFolder.name ?? null,
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

  const tagUsage = useMemo(() => {
    return aggregateRehearsalLibraryTags({
      entityCollections: {
        loops: savedLoops,
        playlists: savedPlaylists,
        sources: savedLibrarySources,
      },
      folders: libraryFiles.folders,
    });
  }, [libraryFiles.folders, savedLibrarySources, savedLoops, savedPlaylists]);

  if (shouldRenderSavedTagsList(selectedView)) {
    return (
      <SavedTagsList
        onSelectTag={onSelectTag}
        searchQuery={searchState.activeLibrarySearchQuery}
        sortState={searchState.tagsSortState}
        tagUsage={tagUsage}
      />
    );
  }

  if (shouldRenderFilesExplorer(selectedView)) {
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
          pendingLoopBuilderSourceId={pendingLoopBuilderSourceId}
          onOpenLoopBuilderForSource={openLoopBuilderForSource}
          onOpenLoopPlaylistSelector={
            trackPlaylistMenu.openLoopPlaylistSelector
          }
          playlistAddMode={
            playlistState.isFilesAddItemsVisible &&
            playlistState.selectedPlaylist !== null
              ? {
                  canMutatePlaylists,
                  isPlaylistMutating,
                  isSavedLibraryMutating,
                  onAddLoop: (loopId) => {
                    const loop = savedLoops.find((currentLoop) => {
                      return currentLoop.id === loopId;
                    });

                    if (!loop) {
                      return;
                    }

                    void playlistState.addLoopToSelectedPlaylist(loop);
                  },
                  onAddSource: (sourceId) => {
                    const source = savedLibrarySources.find((currentSource) => {
                      return currentSource.id === sourceId;
                    });

                    if (!source) {
                      return;
                    }

                    void playlistState.addSourceToSelectedPlaylist(source);
                  },
                  onDone: onDoneAddingFilesPlaylistItems,
                  playlistName: playlistState.selectedPlaylist.name,
                }
              : undefined
          }
          onOpenPlaylist={(playlistId) => {
            playlistState.openPlaylistDetail(
              playlistId,
              playlistDetailOpenContext,
            );
          }}
          onOpenPlaylistAddItems={(playlistId) => {
            onOpenFilesAddItemsForPlaylist({
              playlistId,
              preferredFolderId:
                libraryFiles.explorer?.currentFolder.id ?? null,
            });
          }}
          onOpenFolderTagEditor={onOpenFolderTagEditor}
          onOpenPlaylistTagEditor={onOpenPlaylistTagEditor}
          onPlaylistRenameVisibilityChange={onPlaylistRenameVisibilityChange}
          onDismissSuccessFeedback={onDismissLibraryFilesSuccessFeedback}
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
          onOpenSuccessFeedbackFolder={onOpenLibraryFilesSuccessFeedbackFolder}
          onShowSuccessFeedback={onShowLibraryFilesSuccessFeedback}
          searchState={{
            activeSearchQuery: searchState.activeLibrarySearchQuery,
            entityFilter: searchState.entityFilter,
            filesOpenedAtByNodeKey: searchState.filesOpenedAtByNodeKey,
            filesSearchScope: searchState.filesSearchScope,
            filesSortDirection: searchState.filesSortDirection,
            filesSortMode: searchState.filesSortMode,
            recordFilesEntryOpened: searchState.recordFilesEntryOpened,
            selectedTagFilters: searchState.selectedTagFilters,
            tagFilterMatchMode: searchState.tagFilterMatchMode,
          }}
          successFeedback={libraryFilesSuccessFeedback}
          onTogglePlayableItemPlayback={togglePlayableItemPlayback}
          onToggleSourcePlayback={toggleSourcePlayback}
        />
        {shouldRenderLoopSectionInFiles
          ? cloneElement(loopSection, { isBuilderFocused: true })
          : null}
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
          onOpenFilesAddItemsForPlaylist={(playlistId) => {
            onOpenFilesAddItemsForPlaylist({
              playlistId,
            });
          }}
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
