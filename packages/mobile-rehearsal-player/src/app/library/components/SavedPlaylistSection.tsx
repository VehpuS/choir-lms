import {
  movePlaylistEntry,
  removePlaylistEntry,
  renamePlaylist,
  type Playlist,
} from '@org/audio-library-models';
import { useEffect, useState } from 'react';
import { Text, View } from 'react-native';

import { LOCAL_REHEARSAL_LIBRARY_OWNER_ID } from '../hooks/use-saved-rehearsal-library';
import {
  buildSavedPlaylist,
  getSavedPlaylistRemovalCopy,
  getSelectedPlaylistIssue,
  getSavedPlaylistsStatusCopy,
  resolveSavedPlaylistCards,
  type PlaylistDraftIssue,
  type SavedPlaylistIssue,
  validatePlaylistName,
} from '../utils/saved-playlist-view-model';
import {
  SavedPlaylistCardsList,
  SavedPlaylistCreateCard,
  SavedPlaylistEditorCard,
} from './SavedPlaylistSectionCards';
import { DriveLibraryStatusCard } from './DriveLibraryStatusCard';
import { Alert } from 'react-native';
import { savedPlaylistSectionStyles as styles } from './saved-playlist-section-styles';

type SavedPlaylistSectionProps = {
  canMutatePlaylists: boolean;
  createPlaylist: (playlist: Playlist) => Promise<Playlist | null>;
  deletePlaylist: (playlist: Playlist) => Promise<boolean>;
  isLoading: boolean;
  issue: SavedPlaylistIssue | null;
  pendingPlaylistId: string | null;
  savedPlaylists: Playlist[];
  selectedPlaylist: Playlist | null;
  setSelectedPlaylistId: (playlistId: string) => void;
  showPlaylistCards?: boolean;
  updatePlaylist: (playlist: Playlist) => Promise<Playlist | null>;
};

export const SavedPlaylistSection = ({
  canMutatePlaylists,
  createPlaylist,
  deletePlaylist,
  isLoading,
  issue,
  pendingPlaylistId,
  savedPlaylists,
  selectedPlaylist,
  setSelectedPlaylistId,
  showPlaylistCards = true,
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
  const playlistCards = resolveSavedPlaylistCards(savedPlaylists);
  const statusCopy = getSavedPlaylistsStatusCopy({
    isLoading,
    issue,
    savedPlaylistCount: savedPlaylists.length,
  });
  const selectedPlaylistIssue = getSelectedPlaylistIssue(
    issue,
    selectedPlaylist?.id ?? null,
  );

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
      <View style={styles.sectionCopy}>
        <Text style={styles.eyebrow}>Saved playlists</Text>
        <Text style={styles.sectionTitle}>Build rehearsal running orders</Text>
        <Text style={styles.sectionBody}>
          Create and edit playlists here. The active playlist selector now sits
          above the Library rows so saved tracks and loops can target the right
          rehearsal set before you add them.
        </Text>
      </View>

      <DriveLibraryStatusCard
        isLoading={isLoading}
        loadingLabel="Refreshing saved playlists…"
        statusCopy={statusCopy}
      />

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

      {showPlaylistCards ? (
        <SavedPlaylistCardsList
          onSelectPlaylist={setSelectedPlaylistId}
          playlistCards={playlistCards}
          selectedPlaylistId={selectedPlaylist?.id ?? null}
        />
      ) : null}

      <SavedPlaylistEditorCard
        canMutatePlaylists={canMutatePlaylists}
        isMutating={isMutating}
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
        renameIssue={renameIssue}
        renamePlaylistName={renamePlaylistName}
        selectedPlaylist={selectedPlaylist}
        selectedPlaylistIssue={selectedPlaylistIssue}
      />
    </View>
  );
};
