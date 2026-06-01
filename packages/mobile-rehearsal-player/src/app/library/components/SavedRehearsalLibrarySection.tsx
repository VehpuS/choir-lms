import {
  addLoopToPlaylist,
  addTrackToPlaylist,
  createTrackPlayableItem,
  renamePlaylist,
  type NamedLoop,
  type PlayableItem,
  type Playlist,
} from '@org/audio-library-models';
import { useEffect, useReducer, useState } from 'react';
import { Alert, StyleSheet, View } from 'react-native';

import { useSavedPlaylists } from '../hooks/use-saved-playlists';
import type { SavedRehearsalLibraryIssue } from '../hooks/use-saved-rehearsal-library';
import { LOCAL_REHEARSAL_LIBRARY_OWNER_ID } from '../hooks/use-saved-rehearsal-library';
import {
  type DriveLibrarySource,
  type DriveLibraryStatusCopy,
} from '../utils/drive-library-view-model';
import type { SavedLoopIssue } from '../utils/saved-loop-view-model';
import type { PlaylistPlaybackSession } from '../utils/saved-playlist-playback-view-model';
import { getSelectedPlaylistIssue } from '../utils/saved-playlist-status-view-model';
import {
  buildSavedPlaylist,
  getSavedPlaylistRemovalCopy,
  resolveSavedPlaylistCards,
  resolveSelectedPlaylist,
  validatePlaylistName,
  type PlaylistDraftIssue,
} from '../utils/saved-playlist-view-model';
import { getSavedRehearsalLibrarySourceIssue } from '../utils/saved-rehearsal-library-view-model';
import {
  getSavedTrackPlaybackActionCopy,
  getSavedTrackPlaybackItemIssue,
  isSavedTrackPlaybackActive,
  isSavedTrackPlaybackBusy,
  type SavedTrackPlaybackIssue,
  type SavedTrackPlaybackState,
} from '../utils/saved-track-playback-view-model';
import {
  getSavedTrackPlaylistMenuInitialState,
  reduceSavedTrackPlaylistMenuState,
} from '../utils/saved-track-playlist-menu-view-model';
import { DriveLibrarySectionHeader } from './DriveLibrarySectionHeader';
import { DriveLibrarySourceGroup } from './DriveLibrarySourceGroup';
import { DriveLibraryStatusCard } from './DriveLibraryStatusCard';
import { SavedLoopSection } from './SavedLoopSection';
import { SavedPlaylistSection } from './SavedPlaylistSection';
import { SavedPlaylistCardsList } from './SavedPlaylistSectionCards';
import { SavedTrackPlaylistMenuSurface } from './SavedTrackPlaylistMenuSurface';

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
  getCurrentScrollOffsetY: () => number;
  savedTrackPlaybackStatusCopy: DriveLibraryStatusCopy | null;
  setIsPlaylistReorderDragActive: (isActive: boolean) => void;
  setPlaylistReorderDragMoveY: (moveY: number) => void;
  syncActivePlaylistContext: (options: {
    loops: NamedLoop[];
    playlists: Playlist[];
    sources: DriveLibrarySource[];
  }) => void;
  openLoopBuilderForSource: (source: DriveLibrarySource) => void;
  pendingLoopBuilderSourceId: string | null;
  selectedTrack: PlayableItem | null;
  setSelectedLoopSourceId: (sourceId: string | null) => void;
  togglePlayableItemPlayback: (playableItem: PlayableItem) => Promise<void>;
  queuePlayableItemNext: (playableItem: PlayableItem) => void;
  queuePlayableItemUpNext: (playableItem: PlayableItem) => void;
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
  getCurrentScrollOffsetY,
  savedTrackPlaybackStatusCopy,
  setIsPlaylistReorderDragActive,
  setPlaylistReorderDragMoveY,
  syncActivePlaylistContext,
  openLoopBuilderForSource,
  pendingLoopBuilderSourceId,
  selectedTrack,
  setSelectedLoopSourceId,
  togglePlayableItemPlayback,
  queuePlayableItemNext,
  queuePlayableItemUpNext,
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
  const [cardRenameIssue, setCardRenameIssue] =
    useState<PlaylistDraftIssue | null>(null);
  const [cardRenamePlaylistId, setCardRenamePlaylistId] = useState<
    string | null
  >(null);
  const [cardRenamePlaylistName, setCardRenamePlaylistName] = useState('');
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
  const selectedTrackMenuLoop =
    savedLoops.find((loop) => {
      return loop.id === trackPlaylistMenuState.selectedLoopId;
    }) ?? null;

  useEffect(() => {
    if (!selectedPlaylist) {
      setIsPlaylistDetailVisible(false);
    }
  }, [selectedPlaylist]);

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

  useEffect(() => {
    if (trackPlaylistMenuState.selectedSourceId && !selectedTrackMenuSource) {
      dispatchTrackPlaylistMenu({ type: 'close' });
      setTrackPlaylistCreationIssue(null);
      return;
    }

    if (trackPlaylistMenuState.selectedLoopId && !selectedTrackMenuLoop) {
      dispatchTrackPlaylistMenu({ type: 'close' });
      setTrackPlaylistCreationIssue(null);
      return;
    }

    if (
      !trackPlaylistMenuState.selectedSourceId &&
      !trackPlaylistMenuState.selectedLoopId
    ) {
      return;
    }
  }, [
    selectedTrackMenuLoop,
    selectedTrackMenuSource,
    trackPlaylistMenuState.selectedLoopId,
    trackPlaylistMenuState.selectedSourceId,
  ]);

  const isSavedLibraryMutating = pendingSourceId !== null;
  const isSavedTrackPlaybackLoading = isSavedTrackPlaybackBusy({
    isPreparing: isPlaybackPreparing,
    playbackState,
  });
  const isPlaylistMutating = pendingPlaylistId !== null;
  const playlistCards = resolveSavedPlaylistCards(savedPlaylists);
  const selectedCardRenameIssue =
    cardRenameIssue ??
    getSelectedPlaylistIssue(playlistIssue, cardRenamePlaylistId);
  const savedSourceTitle = `Saved rehearsal tracks (${savedLibrarySources.length})`;
  const isLoopMutating = pendingLoopId !== null;
  const shouldShowSavedLibraryStatus =
    isSavedLibraryLoading || savedLibraryStatusCopy.tone !== 'ready';
  const shouldShowPlaybackStatus =
    savedTrackPlaybackStatusCopy !== null &&
    (isSavedTrackPlaybackLoading ||
      savedTrackPlaybackStatusCopy.tone !== 'ready');

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

  const closeTrackPlaylistMenu = () => {
    dispatchTrackPlaylistMenu({ type: 'close' });
    setTrackPlaylistCreationIssue(null);
  };

  const handleSelectPlaylistForAddTarget = async (playlist: Playlist) => {
    if (selectedTrackMenuSource) {
      const persistedPlaylist = await persistPlaylist(
        playlist,
        (nextPlaylist) => {
          return addTrackToPlaylist(nextPlaylist, selectedTrackMenuSource);
        },
      );

      if (persistedPlaylist) {
        closeTrackPlaylistMenu();
      }

      return;
    }

    if (!selectedTrackMenuLoop) {
      return;
    }

    const persistedPlaylist = await persistPlaylist(
      playlist,
      (nextPlaylist) => {
        return addLoopToPlaylist(nextPlaylist, selectedTrackMenuLoop);
      },
    );

    if (persistedPlaylist) {
      closeTrackPlaylistMenu();
    }
  };

  const handleCreatePlaylistForAddTarget = async () => {
    if (!selectedTrackMenuSource && !selectedTrackMenuLoop) {
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

    let playlistWithTarget: Playlist;

    if (selectedTrackMenuSource) {
      playlistWithTarget = addTrackToPlaylist(
        result.playlist,
        selectedTrackMenuSource,
      );
    } else {
      if (!selectedTrackMenuLoop) {
        return;
      }

      playlistWithTarget = addLoopToPlaylist(
        result.playlist,
        selectedTrackMenuLoop,
      );
    }

    const createdPlaylist = await createPlaylist(playlistWithTarget);

    if (!createdPlaylist) {
      return;
    }

    setSelectedPlaylistId(createdPlaylist.id);
    closeTrackPlaylistMenu();
  };

  const handleDeletePlaylist = (playlistId: string) => {
    const playlist = savedPlaylists.find((currentPlaylist) => {
      return currentPlaylist.id === playlistId;
    });

    if (!playlist) {
      return;
    }

    const removalCopy = getSavedPlaylistRemovalCopy(playlist);

    Alert.alert(removalCopy.title, removalCopy.message, [
      {
        text: 'Cancel',
        style: 'cancel',
      },
      {
        text: removalCopy.confirmLabel,
        style: 'destructive',
        onPress: () => {
          void deletePlaylist(playlist);
        },
      },
    ]);
  };

  const closeCardRenameDialog = () => {
    setCardRenameIssue(null);
    setCardRenamePlaylistId(null);
    setCardRenamePlaylistName('');
  };

  const openCardRenameDialog = (playlistId: string) => {
    const playlist = savedPlaylists.find((currentPlaylist) => {
      return currentPlaylist.id === playlistId;
    });

    if (!playlist) {
      return;
    }

    setCardRenameIssue(null);
    setCardRenamePlaylistId(playlist.id);
    setCardRenamePlaylistName(playlist.name);
  };

  const handleRenamePlaylistCard = async () => {
    if (!cardRenamePlaylistId) {
      return;
    }

    const playlist = savedPlaylists.find((currentPlaylist) => {
      return currentPlaylist.id === cardRenamePlaylistId;
    });

    if (!playlist) {
      closeCardRenameDialog();
      return;
    }

    const nextRenameIssue = validatePlaylistName(cardRenamePlaylistName);

    if (nextRenameIssue) {
      setCardRenameIssue(nextRenameIssue);
      return;
    }

    setCardRenameIssue(null);

    const persistedPlaylist = await updatePlaylist(
      renamePlaylist(playlist, cardRenamePlaylistName),
    );

    if (!persistedPlaylist) {
      return;
    }

    closeCardRenameDialog();
  };

  return (
    <View style={styles.savedLibrarySection}>
      <DriveLibrarySectionHeader
        canRefresh={false}
        isLoading={false}
        onRefresh={() => undefined}
        title="Saved tracks"
        eyebrow="Saved tracks"
      />
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
      {!isPlaylistDetailVisible ? (
        <>
          <SavedPlaylistCardsList
            cardRenameIssue={selectedCardRenameIssue}
            cardRenamePlaylistId={cardRenamePlaylistId}
            cardRenamePlaylistName={cardRenamePlaylistName}
            canMutatePlaylists={canMutatePlaylists}
            isMutating={isPlaylistMutating}
            onBeginRenamePlaylist={openCardRenameDialog}
            onCancelRenamePlaylist={closeCardRenameDialog}
            onDeletePlaylist={handleDeletePlaylist}
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
            onRenamePlaylistNameChange={(value) => {
              setCardRenamePlaylistName(value);
              setCardRenameIssue(null);
            }}
            onSelectPlaylist={(playlistId) => {
              setSelectedPlaylistId(playlistId);
              setIsPlaylistDetailVisible(true);
            }}
            onSubmitRenamePlaylist={() => {
              void handleRenamePlaylistCard();
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
              const canQueueAsNext = activePlaylistSession !== null;

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
                ...(canQueueAsNext
                  ? [
                      {
                        disabled:
                          isSavedLibraryMutating ||
                          source.availability.status !== 'available',
                        label: 'Play next',
                        onPress: () => {
                          queuePlayableItemNext(trackPlayableItem);
                        },
                        variant: 'menu' as const,
                      },
                      {
                        disabled:
                          isSavedLibraryMutating ||
                          source.availability.status !== 'available',
                        label: 'Add to queue',
                        onPress: () => {
                          queuePlayableItemUpNext(trackPlayableItem);
                        },
                        variant: 'menu' as const,
                      },
                    ]
                  : []),
                {
                  disabled:
                    !canMutatePlaylists ||
                    isPlaylistMutating ||
                    isSavedLibraryMutating,
                  label: !canMutatePlaylists
                    ? 'Playlists unavailable'
                    : isPlaylistMutating
                      ? 'Updating playlist…'
                      : 'Add to playlist',
                  onPress: () => {
                    setTrackPlaylistCreationIssue(null);
                    dispatchTrackPlaylistMenu({
                      type: 'open',
                      sourceId: source.id,
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
            canMutateLoops={canMutateLoops}
            canMutatePlaylists={canMutatePlaylists}
            isPlaylistMutating={isPlaylistMutating}
            canQueueAsNext={activePlaylistSession !== null}
            isPlaybackPreparing={isPlaybackPreparing}
            isSavedLoopsLoading={isSavedLoopsLoading}
            pendingLoopId={pendingLoopId}
            playbackIssue={playbackIssue}
            playbackState={playbackState}
            onOpenLoopPlaylistSelector={(loopId) => {
              setTrackPlaylistCreationIssue(null);
              dispatchTrackPlaylistMenu({
                type: 'open-loop-selector',
                loopId,
              });
            }}
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
            queuePlayableItemNext={queuePlayableItemNext}
            queuePlayableItemUpNext={queuePlayableItemUpNext}
          />
        </>
      ) : null}

      <SavedPlaylistSection
        activePlaylistSession={activePlaylistSession}
        canMutatePlaylists={canMutatePlaylists}
        createPlaylist={createPlaylist}
        deletePlaylist={deletePlaylist}
        getCurrentScrollOffsetY={getCurrentScrollOffsetY}
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
        setIsReorderDragActive={setIsPlaylistReorderDragActive}
        setReorderDragMoveY={setPlaylistReorderDragMoveY}
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
          void handleSelectPlaylistForAddTarget(playlist);
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
          void handleCreatePlaylistForAddTarget();
        }}
        selectedLoop={selectedTrackMenuLoop}
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
