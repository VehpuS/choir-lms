import {
  movePlaylistEntry,
  removePlaylistEntry,
  renamePlaylist,
  type NamedLoop,
  type Playlist,
  type RepeatMode,
} from '@org/audio-library-models';
import { useEffect, useState } from 'react';
import { Alert, Text, View } from 'react-native';

import { LOCAL_REHEARSAL_LIBRARY_OWNER_ID } from '../hooks/use-saved-rehearsal-library';
import type { DriveLibrarySource } from '../utils/drive-library-view-model';
import {
  getPlaylistPlaybackActionCopy,
  type PlaylistPlaybackSession,
} from '../utils/saved-playlist-playback-view-model';
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
  playlistRepeatMode: RepeatMode;
  savedPlaylists: Playlist[];
  savedLoops: NamedLoop[];
  savedSources: DriveLibrarySource[];
  selectedPlaylist: Playlist | null;
  setPlaylistRepeatMode: (repeatMode: RepeatMode) => void;
  setSelectedPlaylistId: (playlistId: string) => void;
  togglePlaylistPlayback: (options: {
    loops: NamedLoop[];
    mode: 'ordered' | 'shuffle';
    playlist: Playlist;
    sources: DriveLibrarySource[];
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
  playlistRepeatMode,
  savedPlaylists,
  savedLoops,
  savedSources,
  selectedPlaylist,
  setPlaylistRepeatMode,
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

  useEffect(() => {
    setRenamePlaylistName(selectedPlaylist?.name ?? '');
    setRenameIssue(null);
  }, [selectedPlaylist?.id, selectedPlaylist?.name]);

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
  const shufflePlaybackAction = getPlaylistPlaybackActionCopy({
    activeSession: selectedPlaybackSession,
    isPreparing: isPlaybackPreparing,
    mode: 'shuffle',
    playbackState,
    selectedPlaylist,
  });
  const selectedPlaylistIssue = getSelectedPlaylistIssue(
    issue,
    selectedPlaylist?.id ?? null,
  );
  const detailSummary = selectedPlaylist
    ? getSavedPlaylistDetailSummary({
        activeSession: selectedPlaybackSession,
        playlist: selectedPlaylist,
        savedLoops,
        savedSources,
      })
    : null;

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

  return (
    <View style={styles.section}>
      {!isDetailVisible ? (
        <View style={styles.sectionCopy}>
          <Text style={styles.eyebrow}>Saved playlists</Text>
          <Text style={styles.sectionTitle}>
            Build rehearsal running orders
          </Text>
          <Text style={styles.sectionBody}>
            Create playlists here, then let Library rows add saved tracks and
            loops before opening a dedicated playlist detail surface for order
            and playback.
          </Text>
        </View>
      ) : null}

      <DriveLibraryStatusCard
        isLoading={isLoading}
        loadingLabel="Refreshing saved playlists…"
        statusCopy={statusCopy}
      />

      {isDetailVisible ? (
        <SavedPlaylistDetailCard
          canMutatePlaylists={canMutatePlaylists}
          detailSummary={detailSummary}
          getItemDetailLabel={(entry) => {
            return getSavedPlaylistEntryDetailLabel({
              entry,
              savedLoops,
              savedSources,
            });
          }}
          isMutating={isMutating}
          onCloseDetail={() => {
            onCloseDetail?.();
          }}
          onDeletePlaylist={handleDeletePlaylist}
          onMoveItem={(fromIndex, toIndex) => {
            void persistSelectedPlaylist((playlist) => {
              return movePlaylistEntry(playlist, fromIndex, toIndex);
            });
          }}
          onRemoveItem={(entryId) => {
            void persistSelectedPlaylist((playlist) => {
              return removePlaylistEntry(playlist, entryId);
            });
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
          onSelectRepeatMode={setPlaylistRepeatMode}
          onShufflePlayPlaylist={() => {
            if (!selectedPlaylist) {
              return;
            }

            void togglePlaylistPlayback({
              loops: savedLoops,
              mode: 'shuffle',
              playlist: selectedPlaylist,
              sources: savedSources,
            });
          }}
          orderedPlaybackAction={orderedPlaybackAction}
          playlistRepeatMode={playlistRepeatMode}
          renameIssue={renameIssue}
          renamePlaylistName={renamePlaylistName}
          selectedQueueMode={selectedPlaybackSession?.queue.mode ?? null}
          selectedPlaylist={selectedPlaylist}
          selectedPlaylistIssue={selectedPlaylistIssue}
          shufflePlaybackAction={shufflePlaybackAction}
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
