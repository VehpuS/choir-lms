import {
  renamePlaylist,
  type NamedLoop,
  type Playlist,
} from '@org/audio-library-models';
import { useEffect, useReducer, useState } from 'react';
import { Alert, Text, View } from 'react-native';

import { LOCAL_REHEARSAL_LIBRARY_OWNER_ID } from '../hooks/use-saved-rehearsal-library';
import type { DriveLibrarySource } from '../utils/drive-library-view-model';
import {
  getPlaylistPlaybackCurrentItem,
  getPlaylistPlaybackActionCopy,
  type PlaylistPlaybackSession,
} from '../utils/saved-playlist-playback-view-model';
import {
  buildSavedPlaylistDetailDraftPlaylist,
  getSavedPlaylistDetailInitialState,
  isSavedPlaylistEntryPlayable,
  moveSavedPlaylistDetailEntry,
  reduceSavedPlaylistDetailState,
  removeSavedPlaylistDetailEntry,
  restoreSavedPlaylistDetailEntry,
} from '../utils/saved-playlist-detail-view-model';
import {
  buildSavedPlaylist,
  getSavedPlaylistDetailSummary,
  getSavedPlaylistEntryDetailLabel,
  getSavedPlaylistRemovalCopy,
  type PlaylistDraftIssue,
  type SavedPlaylistIssue,
  validatePlaylistName,
} from '../utils/saved-playlist-view-model';
import {
  getSelectedPlaylistIssue,
  getSavedPlaylistsStatusCopy,
} from '../utils/saved-playlist-status-view-model';
import type { SavedTrackPlaybackState } from '../utils/saved-track-playback-view-model';
import {
  SavedPlaylistCreateCard,
  SavedPlaylistDetailCard,
} from './SavedPlaylistSectionCards';
import { DriveLibraryStatusCard } from './DriveLibraryStatusCard';
import { savedPlaylistSectionStyles as styles } from './saved-playlist-section-styles';

type SavedPlaylistSectionProps = {
  activePlaylistSession: PlaylistPlaybackSession | null;
  canMutatePlaylists: boolean;
  createPlaylist: (playlist: Playlist) => Promise<Playlist | null>;
  deletePlaylist: (playlist: Playlist) => Promise<boolean>;
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
  togglePlaylistPlayback: (options: {
    loops: NamedLoop[];
    mode: 'ordered' | 'shuffle';
    playlist: Playlist;
    sources: DriveLibrarySource[];
    startEntryId?: string;
  }) => Promise<void>;
  updatePlaylist: (playlist: Playlist) => Promise<Playlist | null>;
};

export const SavedPlaylistSection = ({
  activePlaylistSession,
  canMutatePlaylists,
  createPlaylist,
  deletePlaylist,
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

  useEffect(() => {
    setRenamePlaylistName(selectedPlaylist?.name ?? '');
    setRenameIssue(null);
  }, [selectedPlaylist?.id, selectedPlaylist?.name]);

  useEffect(() => {
    dispatchDetailAction({
      type: 'reset',
      entries: isDetailVisible ? (selectedPlaylist?.items ?? []) : [],
    });
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
  const detailPlaylist =
    selectedPlaylist && detailState.isEditing
      ? buildSavedPlaylistDetailDraftPlaylist(
          selectedPlaylist,
          detailState.draftEntries,
          selectedPlaylist.updatedAt,
        )
      : selectedPlaylist;
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

  const handleToggleDetailEditMode = async () => {
    if (!selectedPlaylist) {
      return;
    }

    if (!detailState.isEditing) {
      dispatchDetailAction({
        type: 'enter-edit-mode',
        entries: selectedPlaylist.items,
      });
      return;
    }

    const persistedPlaylist = await persistSelectedPlaylist((playlist) => {
      return buildSavedPlaylistDetailDraftPlaylist(
        playlist,
        detailState.draftEntries,
      );
    });

    if (!persistedPlaylist) {
      return;
    }

    dispatchDetailAction({
      type: 'reset',
      entries: persistedPlaylist.items,
    });
  };

  const handleRemovePlaylistItem = async (entryId: string) => {
    if (!selectedPlaylist) {
      return;
    }

    if (detailState.isEditing) {
      const removalResult = removeSavedPlaylistDetailEntry(
        detailState.draftEntries,
        entryId,
      );

      if (!removalResult) {
        return;
      }

      dispatchDetailAction({
        type: 'update-draft-entries',
        entries: removalResult.nextEntries,
      });
      return;
    }

    const removalResult = removeSavedPlaylistDetailEntry(
      selectedPlaylist.items,
      entryId,
    );

    if (!removalResult) {
      return;
    }

    const persistedPlaylist = await persistSelectedPlaylist((playlist) => {
      return buildSavedPlaylistDetailDraftPlaylist(
        playlist,
        removalResult.nextEntries,
      );
    });

    if (!persistedPlaylist) {
      return;
    }

    dispatchDetailAction({
      type: 'show-removal-notice',
      removalNotice: {
        entry: removalResult.entry,
        previousIndex: removalResult.previousIndex,
      },
    });
  };

  const handleUndoPlaylistRemoval = async () => {
    if (!selectedPlaylist || !detailState.removalNotice) {
      return;
    }

    const restoredEntries = restoreSavedPlaylistDetailEntry(
      selectedPlaylist.items,
      detailState.removalNotice,
    );
    const persistedPlaylist = await persistSelectedPlaylist((playlist) => {
      return buildSavedPlaylistDetailDraftPlaylist(playlist, restoredEntries);
    });

    if (!persistedPlaylist) {
      return;
    }

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
          detailEntries={
            detailState.isEditing
              ? detailState.draftEntries
              : (detailPlaylist?.items ?? [])
          }
          getItemDetailLabel={(entry) => {
            return getSavedPlaylistEntryDetailLabel({
              entry,
              savedLoops,
              savedSources,
            });
          }}
          isEditMode={detailState.isEditing}
          isItemPlayable={(entry) => {
            return isSavedPlaylistEntryPlayable({
              entry,
              savedLoops,
              savedSources,
            });
          }}
          isMutating={isMutating}
          onCloseDetail={() => {
            dispatchDetailAction({
              type: 'reset',
              entries: [],
            });
            onCloseDetail?.();
          }}
          onDismissRemovalNotice={() => {
            dispatchDetailAction({
              type: 'clear-removal-notice',
            });
          }}
          onDeletePlaylist={handleDeletePlaylist}
          onMoveItem={(fromIndex, toIndex) => {
            if (!detailState.isEditing) {
              return;
            }

            dispatchDetailAction({
              type: 'update-draft-entries',
              entries: moveSavedPlaylistDetailEntry(
                detailState.draftEntries,
                fromIndex,
                toIndex,
              ),
            });
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
          onToggleEditMode={() => {
            void handleToggleDetailEditMode();
          }}
          onUndoRemoveItem={() => {
            void handleUndoPlaylistRemoval();
          }}
          orderedPlaybackAction={orderedPlaybackAction}
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
