import {
  renamePlaylist,
  type NamedLoop,
  type Playlist,
} from '@org/audio-library-models';
import { useEffect, useReducer, useRef, useState } from 'react';
import { Alert, Text, View } from 'react-native';

import { savedPlaylistSectionStyles as styles } from '../../components/saved-playlist-section-styles';
import { DriveLibraryStatusCard } from '../../drive/components/drive-library-status-card';
import type { DriveLibrarySource } from '../../drive/utils/drive-library-view-model';
import { LOCAL_REHEARSAL_LIBRARY_OWNER_ID } from '../../hooks/use-saved-rehearsal-library';
import type { SavedTrackPlaybackState } from '../../playback/utils/saved-track-playback-view-model';
import {
  buildSavedPlaylistDetailDraftPlaylist,
  getSavedPlaylistDetailInitialState,
  getSavedPlaylistDetailItemRemovalCopy,
  hasSavedPlaylistDetailEntryOrderChanged,
  isSavedPlaylistEntryPlayable,
  moveSavedPlaylistDetailEntry,
  reduceSavedPlaylistDetailState,
  removeSavedPlaylistDetailEntry,
  restoreSavedPlaylistDetailEntry,
} from '../utils/saved-playlist-detail-view-model';
import {
  getPlaylistPlaybackActionCopy,
  getPlaylistPlaybackCurrentItem,
  type PlaylistPlaybackSession,
} from '../utils/saved-playlist-playback-view-model';
import {
  getSavedPlaylistsStatusCopy,
  getSelectedPlaylistIssue,
} from '../utils/saved-playlist-status-view-model';
import {
  buildSavedPlaylist,
  getSavedPlaylistDetailSummary,
  getSavedPlaylistEntryDetailLabel,
  getSavedPlaylistRemovalCopy,
  validatePlaylistName,
  type PlaylistDraftIssue,
  type SavedPlaylistIssue,
} from '../utils/saved-playlist-view-model';
import {
  SavedPlaylistCreateCard,
  SavedPlaylistDetailCard,
} from './saved-playlist-section-cards';

type SavedPlaylistSectionProps = {
  activePlaylistSession: PlaylistPlaybackSession | null;
  canMutatePlaylists: boolean;
  createPlaylist: (playlist: Playlist) => Promise<Playlist | null>;
  deletePlaylist: (playlist: Playlist) => Promise<boolean>;
  getCurrentScrollOffsetY: () => number;
  isDetailVisible?: boolean;
  isLoading: boolean;
  isPlaybackPreparing: boolean;
  issue: SavedPlaylistIssue | null;
  onCloseDetail?: () => void;
  pendingPlaylistId: string | null;
  playbackState: SavedTrackPlaybackState | undefined;
  savedPlaylists: Playlist[];
  savedLoops: NamedLoop[];
  savedSources: DriveLibrarySource[];
  selectedPlaylist: Playlist | null;
  setSelectedPlaylistId: (playlistId: string) => void;
  setIsReorderDragActive: (isActive: boolean) => void;
  setReorderDragMoveY: (moveY: number) => void;
  toggleActivePlayback: () => Promise<void>;
  togglePlaylistPlayback: (options: {
    loops: NamedLoop[];
    mode: 'ordered' | 'shuffle';
    playlist: Playlist;
    sources: DriveLibrarySource[];
    startEntryId?: string;
  }) => Promise<void>;
  updatePlaylist: (playlist: Playlist) => Promise<Playlist | null>;
};

type PlaylistEntry = Playlist['items'][number];

export const SavedPlaylistSection = ({
  activePlaylistSession,
  canMutatePlaylists,
  createPlaylist,
  deletePlaylist,
  getCurrentScrollOffsetY,
  isDetailVisible = false,
  isLoading,
  isPlaybackPreparing,
  issue,
  onCloseDetail,
  pendingPlaylistId,
  playbackState,
  savedPlaylists,
  savedLoops,
  savedSources,
  selectedPlaylist,
  setSelectedPlaylistId,
  setIsReorderDragActive,
  setReorderDragMoveY,
  toggleActivePlayback,
  togglePlaylistPlayback,
  updatePlaylist,
}: SavedPlaylistSectionProps) => {
  const [creationIssue, setCreationIssue] = useState<PlaylistDraftIssue | null>(
    null,
  );
  const [createPlaylistName, setCreatePlaylistName] = useState('');
  const [renameIssue, setRenameIssue] = useState<PlaylistDraftIssue | null>(
    null,
  );
  const [renamePlaylistName, setRenamePlaylistName] = useState('');
  const [detailState, dispatchDetailAction] = useReducer(
    reduceSavedPlaylistDetailState,
    undefined,
    getSavedPlaylistDetailInitialState,
  );
  const detailEntriesRef = useRef<PlaylistEntry[]>([]);

  const resetDetailEntries = (entries: PlaylistEntry[]) => {
    detailEntriesRef.current = [...entries];
    dispatchDetailAction({
      type: 'reset',
      entries,
    });
  };

  const setDraftEntries = (entries: PlaylistEntry[]) => {
    detailEntriesRef.current = [...entries];
    dispatchDetailAction({
      type: 'update-draft-entries',
      entries,
    });
  };

  useEffect(() => {
    setRenamePlaylistName(selectedPlaylist?.name ?? '');
    setRenameIssue(null);
  }, [selectedPlaylist?.id, selectedPlaylist?.name]);

  useEffect(() => {
    resetDetailEntries(isDetailVisible ? (selectedPlaylist?.items ?? []) : []);
  }, [isDetailVisible, selectedPlaylist?.id]);

  const isMutating = pendingPlaylistId !== null;
  const statusCopy = getSavedPlaylistsStatusCopy({
    isLoading,
    issue,
    savedPlaylistCount: savedPlaylists.length,
  });
  const selectedPlaybackSession =
    activePlaylistSession?.playlistId === selectedPlaylist?.id
      ? activePlaylistSession
      : null;
  const orderedPlaybackAction = getPlaylistPlaybackActionCopy({
    activeSession: selectedPlaybackSession,
    isPreparing: isPlaybackPreparing,
    mode: 'ordered',
    playbackState,
    selectedPlaylist,
  });
  const selectedPlaylistIssue = getSelectedPlaylistIssue(
    issue,
    selectedPlaylist?.id ?? null,
  );
  const detailPlaylist = selectedPlaylist
    ? buildSavedPlaylistDetailDraftPlaylist(
        selectedPlaylist,
        detailState.draftEntries,
        selectedPlaylist.updatedAt,
      )
    : null;
  const detailSummary = detailPlaylist
    ? getSavedPlaylistDetailSummary({
        activeSession: selectedPlaybackSession,
        playlist: detailPlaylist,
        savedLoops,
        savedSources,
      })
    : null;
  const currentPlaylistEntryId = selectedPlaybackSession
    ? (getPlaylistPlaybackCurrentItem(selectedPlaybackSession)
        ?.playlistEntryId ?? null)
    : null;
  const playlistPlaybackToggleLabel = isPlaybackPreparing
    ? 'Loading…'
    : playbackState === 'playing'
      ? 'Pause'
      : playbackState === 'paused' ||
          playbackState === 'ready' ||
          playbackState === 'stopped'
        ? 'Resume'
        : playbackState === 'ended'
          ? 'Replay'
          : 'Play';
  const shouldShowStatusCard = isLoading || statusCopy.tone !== 'ready';

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

    return persistedPlaylist;
  };

  const handleCreatePlaylist = async () => {
    const result = buildSavedPlaylist({
      name: createPlaylistName,
      ownerId: LOCAL_REHEARSAL_LIBRARY_OWNER_ID,
    });

    if (result.issue || !result.playlist) {
      setCreationIssue(result.issue);
      return;
    }

    const persistedPlaylist = await createPlaylist(result.playlist);

    if (!persistedPlaylist) {
      return;
    }

    setCreationIssue(null);
    setCreatePlaylistName('');
    setSelectedPlaylistId(persistedPlaylist.id);
  };

  const handleRenamePlaylist = async () => {
    if (!selectedPlaylist) {
      return;
    }

    const nextRenameIssue = validatePlaylistName(renamePlaylistName);

    if (nextRenameIssue) {
      setRenameIssue(nextRenameIssue);
      return;
    }

    setRenameIssue(null);

    await persistSelectedPlaylist((playlist) => {
      return renamePlaylist(playlist, renamePlaylistName);
    });
  };

  const handleDeletePlaylist = () => {
    if (!selectedPlaylist) {
      return;
    }

    const removalCopy = getSavedPlaylistRemovalCopy(selectedPlaylist);

    Alert.alert(removalCopy.title, removalCopy.message, [
      {
        text: 'Cancel',
        style: 'cancel',
      },
      {
        text: removalCopy.confirmLabel,
        style: 'destructive',
        onPress: () => {
          void deletePlaylist(selectedPlaylist);
        },
      },
    ]);
  };

  const persistPlaylistDetailEntries = async (entries: PlaylistEntry[]) => {
    if (!selectedPlaylist) {
      return;
    }

    if (
      !hasSavedPlaylistDetailEntryOrderChanged(entries, selectedPlaylist.items)
    ) {
      return;
    }

    const persistedPlaylist = await persistSelectedPlaylist((playlist) => {
      return buildSavedPlaylistDetailDraftPlaylist(playlist, entries);
    });

    if (!persistedPlaylist) {
      resetDetailEntries(selectedPlaylist.items);
      return;
    }

    resetDetailEntries(persistedPlaylist.items);
  };

  const handleRemovePlaylistItem = async (entryId: string) => {
    if (!selectedPlaylist) {
      return;
    }

    const removalResult = removeSavedPlaylistDetailEntry(
      detailState.draftEntries,
      entryId,
    );

    if (!removalResult) {
      return;
    }

    const removalCopy = getSavedPlaylistDetailItemRemovalCopy({
      entryTitle: removalResult.entry.title,
      playlistTitle: selectedPlaylist.name,
    });

    Alert.alert(removalCopy.title, removalCopy.message, [
      {
        text: 'Cancel',
        style: 'cancel',
      },
      {
        text: removalCopy.confirmLabel,
        style: 'destructive',
        onPress: () => {
          void (async () => {
            setDraftEntries(removalResult.nextEntries);

            const persistedPlaylist = await persistSelectedPlaylist(
              (playlist) => {
                return buildSavedPlaylistDetailDraftPlaylist(
                  playlist,
                  removalResult.nextEntries,
                );
              },
            );

            if (!persistedPlaylist) {
              resetDetailEntries(selectedPlaylist.items);
              return;
            }

            resetDetailEntries(persistedPlaylist.items);

            dispatchDetailAction({
              type: 'show-removal-notice',
              removalNotice: {
                entry: removalResult.entry,
                previousIndex: removalResult.previousIndex,
              },
            });
          })();
        },
      },
    ]);
  };

  const handleUndoPlaylistRemoval = async () => {
    if (!selectedPlaylist || !detailState.removalNotice) {
      return;
    }

    const restoredEntries = restoreSavedPlaylistDetailEntry(
      detailState.draftEntries,
      detailState.removalNotice,
    );
    const persistedPlaylist = await persistSelectedPlaylist((playlist) => {
      return buildSavedPlaylistDetailDraftPlaylist(playlist, restoredEntries);
    });

    if (!persistedPlaylist) {
      return;
    }

    resetDetailEntries(persistedPlaylist.items);

    dispatchDetailAction({
      type: 'clear-removal-notice',
    });
  };

  return (
    <View style={styles.section}>
      {!isDetailVisible ? (
        <View style={styles.sectionCopy}>
          <Text style={styles.eyebrow}>Saved playlists</Text>
          <Text style={styles.sectionTitle}>Playlists</Text>
        </View>
      ) : null}

      {shouldShowStatusCard ? (
        <DriveLibraryStatusCard
          isLoading={isLoading}
          loadingLabel="Refreshing saved playlists…"
          statusCopy={statusCopy}
        />
      ) : null}

      {isDetailVisible ? (
        <SavedPlaylistDetailCard
          canMutatePlaylists={canMutatePlaylists}
          currentPlaylistEntryId={currentPlaylistEntryId}
          detailSummary={detailSummary}
          detailEntries={detailState.draftEntries}
          getCurrentScrollOffsetY={getCurrentScrollOffsetY}
          getItemDetailLabel={(entry) => {
            return getSavedPlaylistEntryDetailLabel({
              entry,
              savedLoops,
              savedSources,
            });
          }}
          isItemPlayable={(entry) => {
            return isSavedPlaylistEntryPlayable({
              entry,
              savedLoops,
              savedSources,
            });
          }}
          isMutating={isMutating}
          onCloseDetail={() => {
            setIsReorderDragActive(false);
            resetDetailEntries([]);
            onCloseDetail?.();
          }}
          onDismissRemovalNotice={() => {
            dispatchDetailAction({
              type: 'clear-removal-notice',
            });
          }}
          onCommitReorder={() => {
            void persistPlaylistDetailEntries(detailEntriesRef.current);
          }}
          onDeletePlaylist={handleDeletePlaylist}
          onMoveItem={(fromIndex, toIndex, options) => {
            const nextEntries = moveSavedPlaylistDetailEntry(
              detailEntriesRef.current,
              fromIndex,
              toIndex,
            );

            if (nextEntries === detailEntriesRef.current) {
              return;
            }

            setDraftEntries(nextEntries);

            if (options?.persist) {
              void persistPlaylistDetailEntries(nextEntries);
            }
          }}
          onRemoveItem={(entryId) => {
            void handleRemovePlaylistItem(entryId);
          }}
          onRenamePlaylist={() => {
            void handleRenamePlaylist();
          }}
          onRenamePlaylistNameChange={(value) => {
            setRenamePlaylistName(value);
            setRenameIssue(null);
          }}
          onPlayOrderedPlaylist={() => {
            if (!selectedPlaylist) {
              return;
            }

            void togglePlaylistPlayback({
              loops: savedLoops,
              mode: 'ordered',
              playlist: selectedPlaylist,
              sources: savedSources,
            });
          }}
          onPlayPlaylistEntry={(entryId) => {
            if (!selectedPlaylist) {
              return;
            }

            void togglePlaylistPlayback({
              loops: savedLoops,
              mode: 'ordered',
              playlist: selectedPlaylist,
              sources: savedSources,
              startEntryId: entryId,
            });
          }}
          onToggleCurrentPlayback={() => {
            void toggleActivePlayback();
          }}
          onReorderDragActiveChange={setIsReorderDragActive}
          onReorderDragMove={setReorderDragMoveY}
          onUndoRemoveItem={() => {
            void handleUndoPlaylistRemoval();
          }}
          orderedPlaybackAction={orderedPlaybackAction}
          playbackToggleDisabled={isPlaybackPreparing}
          playbackToggleLabel={playlistPlaybackToggleLabel}
          renameIssue={renameIssue}
          renamePlaylistName={renamePlaylistName}
          removalNotice={detailState.removalNotice}
          selectedPlaylist={selectedPlaylist}
          selectedPlaylistIssue={selectedPlaylistIssue}
        />
      ) : (
        <>
          <SavedPlaylistCreateCard
            canMutatePlaylists={canMutatePlaylists}
            createPlaylistName={createPlaylistName}
            creationIssue={creationIssue}
            isMutating={isMutating}
            onCreatePlaylist={() => {
              void handleCreatePlaylist();
            }}
            onCreatePlaylistNameChange={(value) => {
              setCreatePlaylistName(value);
              setCreationIssue(null);
            }}
          />
        </>
      )}
    </View>
  );
};
