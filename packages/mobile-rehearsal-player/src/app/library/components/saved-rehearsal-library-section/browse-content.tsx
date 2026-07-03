import { createTrackPlayableItem } from '@org/audio-library-models';
import { type ReactNode } from 'react';

import { DriveLibrarySourceGroup } from '../../drive/components/drive-library-source-group';
import { getSavedTrackPlaybackItemIssue } from '../../playback/utils/saved-track-playback-view-model';
import {
  getSavedTrackPlaybackActionCopy,
  isSavedTrackPlaybackActive,
} from '../../playback/utils/saved-track-playback-view-model';
import { resolveSavedTrackRowActions } from '../../playback/utils/saved-track-row-actions';
import { SavedPlaylistCardsList } from '../../playlists/components/saved-playlist-section-cards';
import {
  getSavedRehearsalLibraryDependentLoops,
  getSavedRehearsalLibrarySourceIssue,
} from '../../saved-rehearsal-library/view-model';
import type { SavedRehearsalLibrarySectionProps } from './types';
import { useSavedRehearsalLibraryLoopState } from './use-saved-rehearsal-library-loop-state';
import { useSavedRehearsalLibraryPlaylistState } from './use-saved-rehearsal-library-playlist-state';
import { useSavedRehearsalLibrarySearch } from './use-saved-rehearsal-library-search';
import { useSavedRehearsalLibraryTrackPlaylistMenu } from './use-saved-rehearsal-library-track-playlist-menu';

type SearchState = Pick<
  ReturnType<typeof useSavedRehearsalLibrarySearch>,
  | 'activeLibrarySearchQuery'
  | 'visiblePlaylistCards'
  | 'visibleSavedLibrarySources'
>;
type PlaylistState = Pick<
  ReturnType<typeof useSavedRehearsalLibraryPlaylistState>,
  | 'cardRenamePlaylistId'
  | 'cardRenamePlaylistName'
  | 'closeCardRenameDialog'
  | 'handleDeletePlaylist'
  | 'handleRenamePlaylistCard'
  | 'openCardRenameDialog'
  | 'openPlaylistDetail'
  | 'selectedCardRenameIssue'
  | 'selectedPlaylist'
  | 'setCardRenamePlaylistName'
>;
type LoopState = Pick<
  ReturnType<typeof useSavedRehearsalLibraryLoopState>,
  'openTrackLoopView'
>;
type TrackPlaylistMenuState = Pick<
  ReturnType<typeof useSavedRehearsalLibraryTrackPlaylistMenu>,
  'openSourcePlaylistSelector'
>;

type SavedRehearsalLibraryBrowseContentProps = Pick<
  SavedRehearsalLibrarySectionProps,
  | 'activePlayableItem'
  | 'canMutateLibrary'
  | 'canMutateLoops'
  | 'canMutatePlaylists'
  | 'isPlaybackPreparing'
  | 'openLoopBuilderForSource'
  | 'pendingLoopBuilderSourceId'
  | 'pendingSourceId'
  | 'playbackIssue'
  | 'playbackState'
  | 'queuePlayableItemNext'
  | 'queuePlayableItemUpNext'
  | 'removeSource'
  | 'savedLibraryIssue'
  | 'savedLibrarySources'
  | 'savedLoops'
  | 'savedPlaylists'
  | 'togglePlaylistPlayback'
  | 'toggleSourcePlayback'
> & {
  canQueueAsNext: boolean;
  isLoopMutating: boolean;
  isPlaylistMutating: boolean;
  isSavedLibraryMutating: boolean;
  loopSection: ReactNode;
  loopState: LoopState;
  playlistSection: ReactNode;
  playlistState: PlaylistState;
  savedSourceTitle: string;
  searchState: SearchState;
  onOpenPlaylistTagEditor: (playlistId: string) => void;
  onOpenSourceTagEditor: (source: SavedRehearsalLibrarySectionProps['savedLibrarySources'][number]) => void;
  trackPlaylistMenu: TrackPlaylistMenuState;
};

export const SavedRehearsalLibraryBrowseContent = ({
  activePlayableItem,
  canMutateLibrary,
  canMutateLoops,
  canMutatePlaylists,
  canQueueAsNext,
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
  savedSourceTitle,
  searchState,
  onOpenPlaylistTagEditor,
  onOpenSourceTagEditor,
  togglePlaylistPlayback,
  toggleSourcePlayback,
  trackPlaylistMenu,
}: SavedRehearsalLibraryBrowseContentProps) => {
  return (
    <>
      <SavedPlaylistCardsList
        cardRenameIssue={playlistState.selectedCardRenameIssue}
        cardRenamePlaylistId={playlistState.cardRenamePlaylistId}
        cardRenamePlaylistName={playlistState.cardRenamePlaylistName}
        canMutatePlaylists={canMutatePlaylists}
        highlightQuery={searchState.activeLibrarySearchQuery}
        isMutating={isPlaylistMutating}
        onBeginRenamePlaylist={playlistState.openCardRenameDialog}
        onCancelRenamePlaylist={playlistState.closeCardRenameDialog}
        onDeletePlaylist={playlistState.handleDeletePlaylist}
        onEditPlaylistTags={onOpenPlaylistTagEditor}
        onPlayPlaylist={(playlistId) => {
          const playlist = savedPlaylists.find((currentPlaylist) => {
            return currentPlaylist.id === playlistId;
          });

          if (!playlist) {
            return;
          }

          void togglePlaylistPlayback({
            loops: savedLoops,
            mode: 'ordered',
            playlist,
            sources: savedLibrarySources,
          });
        }}
        onRenamePlaylistNameChange={playlistState.setCardRenamePlaylistName}
        onSelectPlaylist={playlistState.openPlaylistDetail}
        onSubmitRenamePlaylist={() => {
          void playlistState.handleRenamePlaylistCard();
        }}
        playlistCards={searchState.visiblePlaylistCards}
        selectedPlaylistId={playlistState.selectedPlaylist?.id ?? null}
      />
      <DriveLibrarySourceGroup
        getActions={(source) => {
          const isPending = pendingSourceId === source.id;
          const trackPlayableItem = createTrackPlayableItem(source);
          const playbackAction = getSavedTrackPlaybackActionCopy({
            activePlayableItem,
            isPreparing: isPlaybackPreparing,
            playableItem: trackPlayableItem,
            playbackState,
          });
          const isPlaybackSourceActive = isSavedTrackPlaybackActive(
            activePlayableItem,
            trackPlayableItem,
          );

          return resolveSavedTrackRowActions({
            canMutateLibrary,
            canMutateLoops,
            canMutatePlaylists,
            canQueueAsNext,
            hasAvailableSource: source.availability.status === 'available',
            hasSavedLoops:
              getSavedRehearsalLibraryDependentLoops(savedLoops, source.id)
                .length > 0,
            isLoopBuilderPreparing: pendingLoopBuilderSourceId !== null,
            isLoopMutating,
            isPendingLoopSource: pendingLoopBuilderSourceId === source.id,
            isPendingRemoval: isPending,
            isPlaybackSourceActive,
            isPlaylistMutating,
            isSavedLibraryMutating,
            onOpenLoopBuilder: () => {
              openLoopBuilderForSource(source);
            },
            onOpenTagEditor: () => {
              onOpenSourceTagEditor(source);
            },
            onOpenPlaylistSelector: () => {
              trackPlaylistMenu.openSourcePlaylistSelector(source.id);
            },
            onQueueNext: () => {
              queuePlayableItemNext(trackPlayableItem);
            },
            onQueueUpNext: () => {
              queuePlayableItemUpNext(trackPlayableItem);
            },
            onRemove: () => {
              removeSource(source);
            },
            onTogglePlayback: () => {
              void toggleSourcePlayback(source);
            },
            onViewTrackLoops: () => {
              loopState.openTrackLoopView(source.id);
            },
            playbackAction,
            sourceName: source.name,
          });
        }}
        getMessage={(source) => {
          return (
            getSavedRehearsalLibrarySourceIssue(
              savedLibraryIssue,
              source,
              'remove',
            ) ??
            getSavedTrackPlaybackItemIssue(
              playbackIssue,
              createTrackPlayableItem(source),
            )
          );
        }}
        highlightQuery={searchState.activeLibrarySearchQuery}
        sources={searchState.visibleSavedLibrarySources}
        title={savedSourceTitle}
      />
      {loopSection}
      {playlistSection}
    </>
  );
};
