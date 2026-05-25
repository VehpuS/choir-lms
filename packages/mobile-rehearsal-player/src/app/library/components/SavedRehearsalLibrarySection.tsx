import {
  addLoopToPlaylist,
  addTrackToPlaylist,
  createTrackPlayableItem,
  type NamedLoop,
  type Playlist,
  type PlayableItem,
} from '@org/audio-library-models';
import { useEffect, useState } from 'react';
import { StyleSheet, View } from 'react-native';

import { useSavedPlaylists } from '../hooks/use-saved-playlists';
import {
  type DriveLibrarySource,
  type DriveLibraryStatusCopy,
} from '../utils/drive-library-view-model';
import { DriveLibrarySectionHeader } from './DriveLibrarySectionHeader';
import { DriveLibrarySourceGroup } from './DriveLibrarySourceGroup';
import { DriveLibraryStatusCard } from './DriveLibraryStatusCard';
import { getSavedRehearsalLibrarySourceIssue } from '../utils/saved-rehearsal-library-view-model';
import {
  getSavedPlaylistLibraryActionCopy,
  getSavedPlaylistSelectionCopy,
  resolveSavedPlaylistCards,
  resolveSelectedPlaylist,
} from '../utils/saved-playlist-view-model';
import type { PlaylistPlaybackSession } from '../utils/saved-playlist-playback-view-model';
import {
  getSavedTrackPlaybackActionCopy,
  getSavedTrackPlaybackItemIssue,
  isSavedTrackPlaybackActive,
  isSavedTrackPlaybackBusy,
  type SavedTrackPlaybackIssue,
  type SavedTrackPlaybackState,
} from '../utils/saved-track-playback-view-model';
import { SavedLoopSection } from './SavedLoopSection';
import { SavedPlaylistCardsList } from './SavedPlaylistSectionCards';
import { SavedPlaylistSection } from './SavedPlaylistSection';
import type { SavedLoopIssue } from '../utils/saved-loop-view-model';
import type { SavedRehearsalLibraryIssue } from '../hooks/use-saved-rehearsal-library';

type SavedRehearsalLibrarySectionProps = {
  activePlayableItem: PlayableItem | null;
  activePlaylistSession: PlaylistPlaybackSession | null;
  canMutateLibrary: boolean;
  canMutateLoops: boolean;
  isPlaybackPreparing: boolean;
  isSavedLibraryLoading: boolean;
  isSavedLoopsLoading: boolean;
  pendingSourceId: string | null;
  pendingLoopId: string | null;
  playbackIssue: SavedTrackPlaybackIssue | null;
  playbackState: SavedTrackPlaybackState | undefined;
  playlistRepeatMode: 'off' | 'one' | 'all';
  positionSeconds: number;
  removeLoop: (loop: NamedLoop) => void;
  removeSource: (source: DriveLibrarySource) => void;
  savedLibraryIssue: SavedRehearsalLibraryIssue | null;
  savedLibrarySources: DriveLibrarySource[];
  savedLoopIssue: SavedLoopIssue | null;
  savedLoops: NamedLoop[];
  savedLibraryStatusCopy: DriveLibraryStatusCopy;
  saveLoop: (loop: NamedLoop) => Promise<boolean>;
  setPlaylistRepeatMode: (repeatMode: 'off' | 'one' | 'all') => void;
  savedTrackPlaybackStatusCopy: DriveLibraryStatusCopy | null;
  selectedLoopSourceId: string | null;
  selectedTrack: PlayableItem | null;
  setSelectedLoopSourceId: (sourceId: string) => void;
  togglePlayableItemPlayback: (playableItem: PlayableItem) => Promise<void>;
  togglePlaylistPlayback: (options: {
    loops: NamedLoop[];
    mode: 'ordered' | 'shuffle';
    playlist: Playlist;
    sources: DriveLibrarySource[];
  }) => Promise<void>;
  toggleSourcePlayback: (source: DriveLibrarySource) => Promise<void>;
};

const BORDER_COLOR = '#d6d1c4';

export const SavedRehearsalLibrarySection = ({
  activePlayableItem,
  activePlaylistSession,
  canMutateLibrary,
  canMutateLoops,
  isPlaybackPreparing,
  isSavedLibraryLoading,
  isSavedLoopsLoading,
  pendingSourceId,
  pendingLoopId,
  playbackIssue,
  playbackState,
  playlistRepeatMode,
  positionSeconds,
  removeLoop,
  removeSource,
  savedLibraryIssue,
  savedLibrarySources,
  savedLoopIssue,
  savedLoops,
  savedLibraryStatusCopy,
  saveLoop,
  setPlaylistRepeatMode,
  savedTrackPlaybackStatusCopy,
  selectedLoopSourceId,
  selectedTrack,
  setSelectedLoopSourceId,
  togglePlayableItemPlayback,
  togglePlaylistPlayback,
  toggleSourcePlayback,
}: SavedRehearsalLibrarySectionProps) => {
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
  const [selectedPlaylistId, setSelectedPlaylistId] = useState<string | null>(
    null,
  );

  useEffect(() => {
    if (savedPlaylists.length === 0) {
      setSelectedPlaylistId(null);
      return;
    }

    const hasSelectedPlaylist = savedPlaylists.some((playlist) => {
      return playlist.id === selectedPlaylistId;
    });

    if (!hasSelectedPlaylist) {
      setSelectedPlaylistId(savedPlaylists[0]?.id ?? null);
    }
  }, [savedPlaylists, selectedPlaylistId]);

  const selectedPlaylist = resolveSelectedPlaylist(
    savedPlaylists,
    selectedPlaylistId,
  );
  const isSavedLibraryMutating = pendingSourceId !== null;
  const isSavedTrackPlaybackLoading = isSavedTrackPlaybackBusy({
    isPreparing: isPlaybackPreparing,
    playbackState,
  });
  const isPlaylistMutating = pendingPlaylistId !== null;
  const playlistCards = resolveSavedPlaylistCards(savedPlaylists);
  const playlistActionCopy = getSavedPlaylistLibraryActionCopy({
    canMutatePlaylists,
    isMutating: isPlaylistMutating,
    selectedPlaylist,
  });
  const playlistSelectionCopy = getSavedPlaylistSelectionCopy({
    savedPlaylistCount: savedPlaylists.length,
    selectedPlaylist,
  });
  const savedSourceTitle = `Saved rehearsal tracks (${savedLibrarySources.length})`;
  const isLoopMutating = pendingLoopId !== null;

  const persistSelectedPlaylist = async (
    buildNextPlaylist: (playlist: Playlist) => Playlist,
  ) => {
    if (!selectedPlaylist) {
      return;
    }

    const persistedPlaylist = await updatePlaylist(
      buildNextPlaylist(selectedPlaylist),
    );

    if (persistedPlaylist) {
      setSelectedPlaylistId(persistedPlaylist.id);
    }
  };

  return (
    <View style={styles.savedLibrarySection}>
      <DriveLibrarySectionHeader
        canRefresh={false}
        isLoading={false}
        onRefresh={() => undefined}
        title="Saved rehearsal library"
        body="Keep explicit Google Drive references ready for full-track playback, loops, and playlists without copying the source media."
        eyebrow="Saved tracks"
      />
      <DriveLibraryStatusCard
        isLoading={isSavedLibraryLoading}
        loadingLabel="Refreshing saved rehearsal tracks…"
        statusCopy={savedLibraryStatusCopy}
      />
      {savedTrackPlaybackStatusCopy ? (
        <DriveLibraryStatusCard
          isLoading={isSavedTrackPlaybackLoading}
          loadingLabel="Starting track playback…"
          statusCopy={savedTrackPlaybackStatusCopy}
        />
      ) : null}
      {playlistSelectionCopy ? (
        <DriveLibraryStatusCard
          isLoading={isPlaylistsLoading}
          loadingLabel="Refreshing playlist destinations…"
          statusCopy={playlistSelectionCopy}
        />
      ) : null}
      <SavedPlaylistCardsList
        onSelectPlaylist={setSelectedPlaylistId}
        playlistCards={playlistCards}
        selectedPlaylistId={selectedPlaylist?.id ?? null}
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

          return [
            {
              disabled: isSavedLibraryMutating || playbackAction.disabled,
              label: playbackAction.label,
              onPress: () => {
                setSelectedLoopSourceId(source.id);
                void toggleSourcePlayback(source);
              },
              tone: 'primary' as const,
            },
            {
              disabled:
                isSavedLibraryMutating ||
                source.availability.status !== 'available',
              label:
                selectedLoopSourceId === source.id
                  ? 'Selected for loop'
                  : 'Use for loop',
              onPress: () => {
                setSelectedLoopSourceId(source.id);
              },
            },
            {
              disabled: playlistActionCopy.disabled,
              label: playlistActionCopy.label,
              onPress: () => {
                void persistSelectedPlaylist((playlist) => {
                  return addTrackToPlaylist(playlist, source);
                });
              },
            },
            {
              disabled:
                !canMutateLibrary ||
                isSavedLibraryMutating ||
                isPlaybackSourceActive ||
                isLoopMutating,
              label: isPending ? 'Removing…' : 'Remove',
              onPress: () => {
                removeSource(source);
              },
            },
          ];
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
        sources={savedLibrarySources}
        title={savedSourceTitle}
      />
      <SavedLoopSection
        activePlayableItem={activePlayableItem}
        addLoopToPlaylist={(loop) => {
          void persistSelectedPlaylist((playlist) => {
            return addLoopToPlaylist(playlist, loop);
          });
        }}
        canMutateLoops={canMutateLoops}
        isPlaybackPreparing={isPlaybackPreparing}
        isSavedLoopsLoading={isSavedLoopsLoading}
        pendingLoopId={pendingLoopId}
        playbackIssue={playbackIssue}
        playbackState={playbackState}
        playlistActionCopy={playlistActionCopy}
        positionSeconds={positionSeconds}
        removeLoop={removeLoop}
        savedSources={savedLibrarySources}
        savedLoopIssue={savedLoopIssue}
        savedLoops={savedLoops}
        saveLoop={saveLoop}
        selectedTrack={selectedTrack}
        togglePlayableItemPlayback={togglePlayableItemPlayback}
      />

      <SavedPlaylistSection
        activePlaylistSession={activePlaylistSession}
        canMutatePlaylists={canMutatePlaylists}
        createPlaylist={createPlaylist}
        deletePlaylist={deletePlaylist}
        isLoading={isPlaylistsLoading}
        isPlaybackPreparing={isPlaybackPreparing}
        issue={playlistIssue}
        pendingPlaylistId={pendingPlaylistId}
        playbackState={playbackState}
        playlistRepeatMode={playlistRepeatMode}
        savedPlaylists={savedPlaylists}
        savedLoops={savedLoops}
        savedSources={savedLibrarySources}
        selectedPlaylist={selectedPlaylist}
        setPlaylistRepeatMode={setPlaylistRepeatMode}
        setSelectedPlaylistId={setSelectedPlaylistId}
        showPlaylistCards={false}
        togglePlaylistPlayback={togglePlaylistPlayback}
        updatePlaylist={updatePlaylist}
      />
    </View>
  );
};

const styles = StyleSheet.create({
  savedLibrarySection: {
    gap: 12,
    padding: 16,
    borderWidth: 1,
    borderColor: BORDER_COLOR,
    borderRadius: 16,
    backgroundColor: '#faf6ee',
  },
});
