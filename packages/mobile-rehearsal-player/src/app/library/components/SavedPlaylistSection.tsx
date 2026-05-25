import {
  addLoopToPlaylist,
  addTrackToPlaylist,
  movePlaylistEntry,
  removePlaylistEntry,
  renamePlaylist,
  type NamedLoop,
  type Playlist,
} from '@org/audio-library-models';
import { useEffect, useState } from 'react';
import { Text, View } from 'react-native';

import { LOCAL_REHEARSAL_LIBRARY_OWNER_ID } from '../hooks/use-saved-rehearsal-library';
import { useSavedPlaylists } from '../hooks/use-saved-playlists';
import type { DriveLibrarySource } from '../utils/drive-library-view-model';
import {
  buildSavedPlaylist,
  getSelectedPlaylistIssue,
  getSavedPlaylistsStatusCopy,
  resolveSavedPlaylistCards,
  validatePlaylistName,
  type PlaylistDraftIssue,
} from '../utils/saved-playlist-view-model';
import {
  SavedPlaylistCardsList,
  SavedPlaylistCreateCard,
  SavedPlaylistEditorCard,
} from './SavedPlaylistSectionCards';
import { DriveLibraryStatusCard } from './DriveLibraryStatusCard';
import { savedPlaylistSectionStyles as styles } from './saved-playlist-section-styles';

type SavedPlaylistSectionProps = {
  savedLoops: NamedLoop[];
  savedSources: DriveLibrarySource[];
};

const getSelectedPlaylist = (
  playlists: Playlist[],
  selectedPlaylistId: string | null,
) => {
  if (!selectedPlaylistId) {
    return playlists[0] ?? null;
  }

  return (
    playlists.find((playlist) => {
      return playlist.id === selectedPlaylistId;
    }) ??
    playlists[0] ??
    null
  );
};

export const SavedPlaylistSection = ({
  savedLoops,
  savedSources,
}: SavedPlaylistSectionProps) => {
  const {
    canMutatePlaylists,
    createPlaylist,
    deletePlaylist,
    isLoading,
    issue,
    pendingPlaylistId,
    savedPlaylists,
    updatePlaylist,
  } = useSavedPlaylists();
  const [creationIssue, setCreationIssue] = useState<PlaylistDraftIssue | null>(
    null,
  );
  const [createPlaylistName, setCreatePlaylistName] = useState('');
  const [renameIssue, setRenameIssue] = useState<PlaylistDraftIssue | null>(
    null,
  );
  const [renamePlaylistName, setRenamePlaylistName] = useState('');
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

  const selectedPlaylist = getSelectedPlaylist(
    savedPlaylists,
    selectedPlaylistId,
  );

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

  return (
    <View style={styles.section}>
      <View style={styles.sectionCopy}>
        <Text style={styles.eyebrow}>Saved playlists</Text>
        <Text style={styles.sectionTitle}>Build rehearsal running orders</Text>
        <Text style={styles.sectionBody}>
          Create playlists, add saved full tracks and loops, then reorder or
          trim the running order without leaving Library.
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

      <SavedPlaylistCardsList
        onSelectPlaylist={setSelectedPlaylistId}
        playlistCards={playlistCards}
        selectedPlaylistId={selectedPlaylist?.id ?? null}
      />

      <SavedPlaylistEditorCard
        canMutatePlaylists={canMutatePlaylists}
        isMutating={isMutating}
        onAddLoop={(loop) => {
          void persistSelectedPlaylist((playlist) => {
            return addLoopToPlaylist(playlist, loop);
          });
        }}
        onAddSource={(source) => {
          void persistSelectedPlaylist((playlist) => {
            return addTrackToPlaylist(playlist, source);
          });
        }}
        onDeletePlaylist={() => {
          if (!selectedPlaylist) {
            return;
          }

          void deletePlaylist(selectedPlaylist);
        }}
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
        savedLoops={savedLoops}
        savedSources={savedSources}
        selectedPlaylist={selectedPlaylist}
        selectedPlaylistIssue={selectedPlaylistIssue}
      />
    </View>
  );
};
