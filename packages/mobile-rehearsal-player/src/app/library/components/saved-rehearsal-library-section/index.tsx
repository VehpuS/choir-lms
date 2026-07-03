import { useEffect, useState } from 'react';
import { StyleSheet, View } from 'react-native';

import { DriveLibrarySectionHeader } from '../../drive/components/drive-library-section-header';
import { DriveLibraryStatusCard } from '../../drive/components/drive-library-status-card';
import { SavedLoopSection } from '../../loops/components/saved-loop-section';
import { isSavedTrackPlaybackBusy } from '../../playback/utils/saved-track-playback-view-model';
import { SavedPlaylistSection } from '../../playlists/components/saved-playlist-section';
import { SavedTrackPlaylistMenuSurface } from '../../playlists/components/saved-track-playlist-menu-surface';
import { resolveSavedRehearsalLibraryDetailMode } from '../../saved-rehearsal-library/detail-mode';
import {
  LibrarySearchPanel,
  LibrarySearchPanelActions,
  type LibrarySearchPanelMode,
} from '../../search/components/library-search-panel';
import { SavedRehearsalLibraryBrowseContent } from './browse-content';
import type { SavedRehearsalLibrarySectionProps } from './types';
import { useSavedRehearsalLibraryLoopState } from './use-saved-rehearsal-library-loop-state';
import { useSavedRehearsalLibraryPlaylistState } from './use-saved-rehearsal-library-playlist-state';
import { useSavedRehearsalLibrarySearch } from './use-saved-rehearsal-library-search';
import { useSavedRehearsalLibraryTrackPlaylistMenu } from './use-saved-rehearsal-library-track-playlist-menu';

const BORDER_COLOR = '#d6d1c4';

export const SavedRehearsalLibrarySection = ({
  activePlayableItem,
  activePlaylistSession,
  canMutateLibrary,
  canMutateLoops,
  canMutatePlaylists,
  createPlaylist,
  deletePlaylist,
  getCurrentScrollOffsetY,
  isPlaybackPreparing,
  isPlaylistsLoading,
  isSavedLibraryLoading,
  isSavedLoopsLoading,
  openLoopBuilderForSource,
  pendingLoopBuilderSourceId,
  pendingLoopId,
  pendingPlaylistId,
  pendingSourceId,
  playbackIssue,
  playbackState,
  playlistIssue,
  queuePlayableItemNext,
  queuePlayableItemUpNext,
  removeLoop,
  removeSource,
  savedLibraryIssue,
  savedLibrarySources,
  savedLibraryStatusCopy,
  savedLoopIssue,
  savedLoops,
  savedPlaylists,
  savedTrackPlaybackStatusCopy,
  saveLoop,
  selectedTrack,
  setIsPlaylistReorderDragActive,
  setPlaylistReorderDragMoveY,
  setSelectedLoopSourceId,
  syncActivePlaylistContext,
  toggleActivePlayback,
  togglePlayableItemPlayback,
  togglePlaylistPlayback,
  toggleSourcePlayback,
  updatePlaylist,
}: SavedRehearsalLibrarySectionProps) => {
  const [searchPanelMode, setSearchPanelMode] =
    useState<LibrarySearchPanelMode>('collapsed');
  const searchState = useSavedRehearsalLibrarySearch({
    savedLibrarySources,
    savedLoops,
    savedPlaylists,
  });
  const playlistState = useSavedRehearsalLibraryPlaylistState({
    deletePlaylist,
    playlistIssue,
    savedPlaylists,
    updatePlaylist,
  });
  const trackPlaylistMenu = useSavedRehearsalLibraryTrackPlaylistMenu({
    createPlaylist,
    savedLibrarySources,
    savedLoops,
    setSelectedPlaylistId: playlistState.setSelectedPlaylistId,
    updatePlaylist,
  });
  const isSavedLibraryMutating = pendingSourceId !== null;
  const isSavedTrackPlaybackLoading = isSavedTrackPlaybackBusy({
    isPreparing: isPlaybackPreparing,
    playbackState,
  });
  const isSearchPanelVisible = searchPanelMode === 'search';
  const isPlaylistMutating = pendingPlaylistId !== null;
  const isLoopMutating = pendingLoopId !== null;
  const loopState = useSavedRehearsalLibraryLoopState({
    activePlaylistSession,
    canMutateLoops,
    isLibrarySearchMode: searchState.isLibrarySearchMode,
    isLoopMutating,
    isPlaybackPreparing,
    openLoopBuilderForSource,
    pendingLoopBuilderSourceId,
    playbackState,
    savedLibrarySources,
    savedLoops,
    selectedTrack,
    setSelectedLoopSourceId,
    togglePlaylistPlayback,
  });

  useEffect(() => {
    syncActivePlaylistContext({
      loops: savedLoops,
      playlists: savedPlaylists,
      sources: savedLibrarySources,
    });
  }, [
    savedLibrarySources,
    savedLoops,
    savedPlaylists,
    syncActivePlaylistContext,
  ]);

  const detailMode = resolveSavedRehearsalLibraryDetailMode({
    isPlaylistDetailVisible: playlistState.isPlaylistDetailVisible,
    selectedLoopViewSourceId: loopState.selectedLoopViewSourceId,
  });
  const isTrackLoopDetailVisible = detailMode === 'track-loop-detail';
  const isPlaylistDetailMode = detailMode === 'playlist-detail';
  const canQueueAsNext = activePlayableItem !== null;
  const shouldShowSavedLibraryStatus =
    !isSearchPanelVisible &&
    (isSavedLibraryLoading || savedLibraryStatusCopy.tone !== 'ready');
  const shouldShowPlaybackStatus =
    !isSearchPanelVisible &&
    savedTrackPlaybackStatusCopy !== null &&
    (isSavedTrackPlaybackLoading ||
      savedTrackPlaybackStatusCopy.tone !== 'ready');
  const shouldShowSearchResults =
    isSearchPanelVisible && searchState.isLibrarySearchMode;
  const savedSourceTitle = shouldShowSearchResults
    ? `Matching saved rehearsal tracks (${searchState.visibleSavedLibrarySources.length})`
    : `Saved rehearsal tracks (${savedLibrarySources.length})`;

  const handleSearchPanelModeChange = (nextMode: LibrarySearchPanelMode) => {
    setSearchPanelMode(nextMode);

    if (nextMode === 'search') {
      if (searchState.librarySearchQuery.trim().length > 0) {
        searchState.submitLibrarySearch();
      }

      return;
    }

    if (searchPanelMode === 'search') {
      searchState.deactivateLibrarySearch();
    }
  };

  const librarySearchPanel = (
    <LibrarySearchPanel
      availabilityFilter={searchState.availabilityFilter}
      entityFilter={searchState.entityFilter}
      onClearSearch={searchState.clearLibrarySearch}
      onPanelModeChange={handleSearchPanelModeChange}
      onSearch={searchState.submitLibrarySearch}
      onSearchQueryChange={searchState.handleLibrarySearchQueryChange}
      onSelectAvailabilityFilter={searchState.setAvailabilityFilter}
      onSelectEntityFilter={searchState.setEntityFilter}
      onSelectRecentSearchTerm={searchState.runLibrarySearch}
      panelMode={searchPanelMode}
      recentSearchTerms={searchState.recentLibrarySearchTerms}
      searchQuery={searchState.librarySearchQuery}
    />
  );

  const loopSection = (
    <SavedLoopSection
      activePlayableItem={activePlayableItem}
      canMutateLoops={canMutateLoops}
      canMutatePlaylists={canMutatePlaylists}
      canQueueAsNext={canQueueAsNext}
      editingLoop={loopState.selectedLoopEdit}
      highlightQuery={searchState.activeLibrarySearchQuery}
      isPlaybackPreparing={isPlaybackPreparing}
      isPlaylistMutating={isPlaylistMutating}
      isSavedLoopsLoading={isSavedLoopsLoading}
      isTrackLoopDetailVisible={isTrackLoopDetailVisible}
      onCloseLoopBuilder={loopState.closeLoopBuilder}
      onEditLoop={loopState.openLoopEditor}
      onOpenLoopPlaylistSelector={trackPlaylistMenu.openLoopPlaylistSelector}
      pendingLoopId={pendingLoopId}
      playbackIssue={playbackIssue}
      playbackState={playbackState}
      queuePlayableItemNext={queuePlayableItemNext}
      queuePlayableItemUpNext={queuePlayableItemUpNext}
      removeLoop={removeLoop}
      savedLoopIssue={savedLoopIssue}
      savedLoops={searchState.visibleSavedLoops}
      savedSources={savedLibrarySources}
      saveLoop={saveLoop}
      selectedTrack={selectedTrack}
      toggleActivePlayback={toggleActivePlayback}
      togglePlayableItemPlayback={togglePlayableItemPlayback}
      trackLoopView={isTrackLoopDetailVisible ? loopState.trackLoopView : null}
    />
  );

  const playlistSection = (
    <SavedPlaylistSection
      activePlaylistSession={activePlaylistSession}
      canMutatePlaylists={canMutatePlaylists}
      createPlaylist={createPlaylist}
      deletePlaylist={deletePlaylist}
      getCurrentScrollOffsetY={getCurrentScrollOffsetY}
      isDetailVisible={isPlaylistDetailMode}
      isLoading={isPlaylistsLoading}
      isPlaybackPreparing={isPlaybackPreparing}
      issue={playlistIssue}
      onCloseDetail={playlistState.closePlaylistDetail}
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

  return (
    <View style={styles.savedLibrarySection}>
      <DriveLibrarySectionHeader
        canRefresh={false}
        isLoading={false}
        onRefresh={() => undefined}
        trailingAction={
          <LibrarySearchPanelActions
            availabilityFilter={searchState.availabilityFilter}
            entityFilter={searchState.entityFilter}
            onPanelModeChange={handleSearchPanelModeChange}
            panelMode={searchPanelMode}
          />
        }
        title="Saved tracks"
      />
      {librarySearchPanel}
      {shouldShowSavedLibraryStatus ? (
        <DriveLibraryStatusCard
          isLoading={isSavedLibraryLoading}
          loadingLabel="Refreshing saved rehearsal tracks…"
          statusCopy={savedLibraryStatusCopy}
        />
      ) : null}
      {savedTrackPlaybackStatusCopy && shouldShowPlaybackStatus ? (
        <DriveLibraryStatusCard
          isLoading={isSavedTrackPlaybackLoading}
          loadingLabel="Starting track playback…"
          statusCopy={savedTrackPlaybackStatusCopy}
        />
      ) : null}
      {isSearchPanelVisible ? (
        shouldShowSearchResults ? (
          <SavedRehearsalLibraryBrowseContent
            activePlayableItem={activePlayableItem}
            canMutateLibrary={canMutateLibrary}
            canMutateLoops={canMutateLoops}
            canMutatePlaylists={canMutatePlaylists}
            canQueueAsNext={canQueueAsNext}
            isLoopMutating={isLoopMutating}
            isPlaybackPreparing={isPlaybackPreparing}
            isPlaylistMutating={isPlaylistMutating}
            isSavedLibraryMutating={isSavedLibraryMutating}
            loopSection={loopSection}
            loopState={loopState}
            openLoopBuilderForSource={openLoopBuilderForSource}
            pendingLoopBuilderSourceId={pendingLoopBuilderSourceId}
            pendingSourceId={pendingSourceId}
            playbackIssue={playbackIssue}
            playbackState={playbackState}
            playlistSection={playlistSection}
            playlistState={playlistState}
            queuePlayableItemNext={queuePlayableItemNext}
            queuePlayableItemUpNext={queuePlayableItemUpNext}
            removeSource={removeSource}
            savedLibraryIssue={savedLibraryIssue}
            savedLibrarySources={savedLibrarySources}
            savedLoops={savedLoops}
            savedPlaylists={savedPlaylists}
            savedSourceTitle={savedSourceTitle}
            searchState={searchState}
            togglePlaylistPlayback={togglePlaylistPlayback}
            toggleSourcePlayback={toggleSourcePlayback}
            trackPlaylistMenu={trackPlaylistMenu}
          />
        ) : null
      ) : detailMode === 'browse' ? (
        <SavedRehearsalLibraryBrowseContent
          activePlayableItem={activePlayableItem}
          canMutateLibrary={canMutateLibrary}
          canMutateLoops={canMutateLoops}
          canMutatePlaylists={canMutatePlaylists}
          canQueueAsNext={canQueueAsNext}
          isLoopMutating={isLoopMutating}
          isPlaybackPreparing={isPlaybackPreparing}
          isPlaylistMutating={isPlaylistMutating}
          isSavedLibraryMutating={isSavedLibraryMutating}
          loopSection={loopSection}
          loopState={loopState}
          openLoopBuilderForSource={openLoopBuilderForSource}
          pendingLoopBuilderSourceId={pendingLoopBuilderSourceId}
          pendingSourceId={pendingSourceId}
          playbackIssue={playbackIssue}
          playbackState={playbackState}
          playlistSection={playlistSection}
          playlistState={playlistState}
          queuePlayableItemNext={queuePlayableItemNext}
          queuePlayableItemUpNext={queuePlayableItemUpNext}
          removeSource={removeSource}
          savedLibraryIssue={savedLibraryIssue}
          savedLibrarySources={savedLibrarySources}
          savedLoops={savedLoops}
          savedPlaylists={savedPlaylists}
          savedSourceTitle={savedSourceTitle}
          searchState={searchState}
          togglePlaylistPlayback={togglePlaylistPlayback}
          toggleSourcePlayback={toggleSourcePlayback}
          trackPlaylistMenu={trackPlaylistMenu}
        />
      ) : isPlaylistDetailMode ? (
        playlistSection
      ) : (
        loopSection
      )}
      <SavedTrackPlaylistMenuSurface
        {...trackPlaylistMenu.menuSurfaceProps}
        isMutating={isPlaylistMutating}
        playlists={savedPlaylists}
      />
    </View>
  );
};

const styles = StyleSheet.create({
  savedLibrarySection: {
    position: 'relative',
    gap: 12,
    padding: 16,
    borderWidth: 1,
    borderColor: BORDER_COLOR,
    borderRadius: 16,
    backgroundColor: '#faf6ee',
  },
});
