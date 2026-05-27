import {
  addLoopToPlaylist,
  addTrackToPlaylist,
  createTrackPlayableItem,
  type NamedLoop,
  type Playlist,
  type PlayableItem,
} from '@org/audio-library-models';
import { useEffect, useReducer, useState } from 'react';
import { StyleSheet, View } from 'react-native';

import { LOCAL_REHEARSAL_LIBRARY_OWNER_ID } from '../hooks/use-saved-rehearsal-library';
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
  buildSavedPlaylist,
  getSavedPlaylistLibraryActionCopy,
  getSavedPlaylistSelectionCopy,
  resolveSavedPlaylistCards,
  resolveSelectedPlaylist,
  type PlaylistDraftIssue,
} from '../utils/saved-playlist-view-model';
import {
  getSavedTrackPlaylistMenuInitialState,
  reduceSavedTrackPlaylistMenuState,
} from '../utils/saved-track-playlist-menu-view-model';
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
import { SavedTrackPlaylistMenuSurface } from './SavedTrackPlaylistMenuSurface';
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
  removeLoop: (loop: NamedLoop) => void;
  removeSource: (source: DriveLibrarySource) => void;
  savedLibraryIssue: SavedRehearsalLibraryIssue | null;
  savedLibrarySources: DriveLibrarySource[];
  savedLoopIssue: SavedLoopIssue | null;
  savedLoops: NamedLoop[];
  savedLibraryStatusCopy: DriveLibraryStatusCopy;
  saveLoop: (loop: NamedLoop) => Promise<boolean>;
  savedTrackPlaybackStatusCopy: DriveLibraryStatusCopy | null;
  openLoopBuilderForSource: (source: DriveLibrarySource) => void;
  pendingLoopBuilderSourceId: string | null;
  selectedTrack: PlayableItem | null;
  setSelectedLoopSourceId: (sourceId: string | null) => void;
  togglePlayableItemPlayback: (playableItem: PlayableItem) => Promise<void>;
  togglePlaylistPlayback: (options: {
    loops: NamedLoop[];
    mode: 'ordered' | 'shuffle';
    playlist: Playlist;
    sources: DriveLibrarySource[];
    startEntryId?: string;
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
  removeLoop,
  removeSource,
  savedLibraryIssue,
  savedLibrarySources,
  savedLoopIssue,
  savedLoops,
  savedLibraryStatusCopy,
  saveLoop,
  savedTrackPlaybackStatusCopy,
  openLoopBuilderForSource,
  pendingLoopBuilderSourceId,
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
  const [isPlaylistDetailVisible, setIsPlaylistDetailVisible] = useState(false);
  const [trackPlaylistCreationIssue, setTrackPlaylistCreationIssue] =
    useState<PlaylistDraftIssue | null>(null);
  const [trackPlaylistMenuState, dispatchTrackPlaylistMenu] = useReducer(
    reduceSavedTrackPlaylistMenuState,
    undefined,
    getSavedTrackPlaylistMenuInitialState,
  );

  useEffect(() => {
    if (savedPlaylists.length === 0) {
      setSelectedPlaylistId(null);
      setIsPlaylistDetailVisible(false);
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
  const selectedTrackMenuSource =
    savedLibrarySources.find((source) => {
      return source.id === trackPlaylistMenuState.selectedSourceId;
    }) ?? null;

  useEffect(() => {
    if (!selectedPlaylist) {
      setIsPlaylistDetailVisible(false);
    }
  }, [selectedPlaylist]);

  useEffect(() => {
    if (!trackPlaylistMenuState.selectedSourceId || selectedTrackMenuSource) {
      return;
    }

    dispatchTrackPlaylistMenu({ type: 'close' });
    setTrackPlaylistCreationIssue(null);
  }, [selectedTrackMenuSource, trackPlaylistMenuState.selectedSourceId]);

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

  const persistPlaylist = async (
    playlist: Playlist,
    buildNextPlaylist: (playlist: Playlist) => Playlist,
  ) => {
    const persistedPlaylist = await updatePlaylist(buildNextPlaylist(playlist));

    if (persistedPlaylist) {
      setSelectedPlaylistId(persistedPlaylist.id);
    }

    return persistedPlaylist;
  };

  const persistSelectedPlaylist = async (
    buildNextPlaylist: (playlist: Playlist) => Playlist,
  ) => {
    if (!selectedPlaylist) {
      return null;
    }

    return persistPlaylist(selectedPlaylist, buildNextPlaylist);
  };

  const closeTrackPlaylistMenu = () => {
    dispatchTrackPlaylistMenu({ type: 'close' });
    setTrackPlaylistCreationIssue(null);
  };

  const handleSelectTrackPlaylist = async (playlist: Playlist) => {
    if (!selectedTrackMenuSource) {
      return;
    }

    const persistedPlaylist = await persistPlaylist(
      playlist,
      (nextPlaylist) => {
        return addTrackToPlaylist(nextPlaylist, selectedTrackMenuSource);
      },
    );

    if (persistedPlaylist) {
      closeTrackPlaylistMenu();
    }
  };

  const handleCreateTrackPlaylist = async () => {
    if (!selectedTrackMenuSource) {
      return;
    }

    const result = buildSavedPlaylist({
      name: trackPlaylistMenuState.draftName,
      ownerId: LOCAL_REHEARSAL_LIBRARY_OWNER_ID,
    });

    if (result.issue || !result.playlist) {
      setTrackPlaylistCreationIssue(result.issue);
      return;
    }

    const createdPlaylist = await createPlaylist(
      addTrackToPlaylist(result.playlist, selectedTrackMenuSource),
    );

    if (!createdPlaylist) {
      return;
    }

    setSelectedPlaylistId(createdPlaylist.id);
    closeTrackPlaylistMenu();
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
      {playlistSelectionCopy && !isPlaylistDetailVisible ? (
        <DriveLibraryStatusCard
          isLoading={isPlaylistsLoading}
          loadingLabel="Refreshing playlist destinations…"
          statusCopy={playlistSelectionCopy}
        />
      ) : null}
      {!isPlaylistDetailVisible ? (
        <>
          <SavedPlaylistCardsList
            onSelectPlaylist={(playlistId) => {
              setSelectedPlaylistId(playlistId);
              setIsPlaylistDetailVisible(true);
            }}
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
              const isLoopBuilderPreparing =
                pendingLoopBuilderSourceId !== null;
              const isPreparingLoopSource =
                pendingLoopBuilderSourceId === source.id;

              return [
                {
                  disabled: isSavedLibraryMutating || playbackAction.disabled,
                  label: playbackAction.label,
                  onPress: () => {
                    void toggleSourcePlayback(source);
                  },
                  tone: 'primary' as const,
                },
                {
                  disabled:
                    !canMutateLoops ||
                    isLoopMutating ||
                    isLoopBuilderPreparing ||
                    isSavedLibraryMutating ||
                    source.availability.status !== 'available',
                  label: isPreparingLoopSource
                    ? 'Preparing loop…'
                    : 'Make loop',
                  onPress: () => {
                    openLoopBuilderForSource(source);
                  },
                },
                {
                  accessibilityLabel: 'More options',
                  disabled:
                    !canMutatePlaylists ||
                    isPlaylistMutating ||
                    isSavedLibraryMutating,
                  label: '...',
                  onPress: () => {
                    setTrackPlaylistCreationIssue(null);
                    dispatchTrackPlaylistMenu({
                      type: 'open',
                      sourceId: source.id,
                    });
                  },
                  variant: 'icon' as const,
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
            onCloseLoopBuilder={() => {
              setSelectedLoopSourceId(null);
            }}
            removeLoop={removeLoop}
            savedSources={savedLibrarySources}
            savedLoopIssue={savedLoopIssue}
            savedLoops={savedLoops}
            saveLoop={saveLoop}
            selectedTrack={selectedTrack}
            togglePlayableItemPlayback={togglePlayableItemPlayback}
          />
        </>
      ) : null}

      <SavedPlaylistSection
        activePlaylistSession={activePlaylistSession}
        canMutatePlaylists={canMutatePlaylists}
        createPlaylist={createPlaylist}
        deletePlaylist={deletePlaylist}
        isDetailVisible={isPlaylistDetailVisible}
        isLoading={isPlaylistsLoading}
        isPlaybackPreparing={isPlaybackPreparing}
        issue={playlistIssue}
        onCloseDetail={() => {
          setIsPlaylistDetailVisible(false);
        }}
        pendingPlaylistId={pendingPlaylistId}
        playbackState={playbackState}
        savedPlaylists={savedPlaylists}
        savedLoops={savedLoops}
        savedSources={savedLibrarySources}
        selectedPlaylist={selectedPlaylist}
        setSelectedPlaylistId={setSelectedPlaylistId}
        togglePlaylistPlayback={togglePlaylistPlayback}
        updatePlaylist={updatePlaylist}
      />

      <SavedTrackPlaylistMenuSurface
        createPlaylistIssue={trackPlaylistCreationIssue}
        draftName={trackPlaylistMenuState.draftName}
        isMutating={isPlaylistMutating}
        onClose={closeTrackPlaylistMenu}
        onDraftNameChange={(value) => {
          setTrackPlaylistCreationIssue(null);
          dispatchTrackPlaylistMenu({
            type: 'update-draft',
            value,
          });
        }}
        onSelectPlaylist={(playlist) => {
          void handleSelectTrackPlaylist(playlist);
        }}
        onShowCreatePlaylist={() => {
          setTrackPlaylistCreationIssue(null);
          dispatchTrackPlaylistMenu({ type: 'open-create' });
        }}
        onShowPlaylistSelector={() => {
          setTrackPlaylistCreationIssue(null);
          dispatchTrackPlaylistMenu(
            trackPlaylistMenuState.step === 'create'
              ? { type: 'cancel-create' }
              : { type: 'open-selector' },
          );
        }}
        onSubmitNewPlaylist={() => {
          void handleCreateTrackPlaylist();
        }}
        playlists={savedPlaylists}
        selectedSource={selectedTrackMenuSource}
        step={trackPlaylistMenuState.step}
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
