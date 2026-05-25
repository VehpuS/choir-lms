import type { Playlist } from '@org/rehearsal-domain';
import { AsyncStoragePracticeRepository } from '@org/rehearsal-playback';
import { useEffect, useState } from 'react';

import type { SavedPlaylistIssue } from '../utils/saved-playlist-view-model';
import {
  LOCAL_REHEARSAL_LIBRARY_OWNER_ID,
  verifySavedRehearsalLibraryStorage,
} from './use-saved-rehearsal-library';

type SavedPlaylistReader = Pick<AsyncStoragePracticeRepository, 'listPlaylists'>;

const INITIAL_LOAD_ATTEMPTS = 2;
const STORAGE_UNAVAILABLE_ISSUE: SavedPlaylistIssue = {
  kind: 'storage',
  title: 'Saved playlist storage unavailable',
  message:
    'This build could not access the device storage needed for saved rehearsal playlists.',
};
const practiceRepository = new AsyncStoragePracticeRepository();

const createMutationIssue = (
  kind: 'delete' | 'save',
  playlist: Pick<Playlist, 'id' | 'name'>,
  error: unknown,
): SavedPlaylistIssue => {
  const detail = error instanceof Error ? error.message.trim() : '';
  const fallbackMessage =
    kind === 'delete'
      ? `The rehearsal library could not remove the playlist "${playlist.name}".`
      : `The rehearsal library could not save the playlist "${playlist.name}".`;

  return {
    kind,
    playlistId: playlist.id,
    title:
      kind === 'delete' ? 'Could not remove playlist' : 'Could not save playlist',
    message: detail ? `${fallbackMessage} ${detail}` : fallbackMessage,
  };
};

export const loadSavedPlaylists = async (
  repository: SavedPlaylistReader,
  ownerId: string,
) => {
  for (let attempt = 0; attempt < INITIAL_LOAD_ATTEMPTS; attempt += 1) {
    try {
      return await repository.listPlaylists(ownerId);
    } catch {
      if (attempt === INITIAL_LOAD_ATTEMPTS - 1) {
        return [] as Playlist[];
      }
    }
  }

  return [] as Playlist[];
};

export const useSavedPlaylists = () => {
  const [savedPlaylists, setSavedPlaylists] = useState<Playlist[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [issue, setIssue] = useState<SavedPlaylistIssue | null>(null);
  const [pendingPlaylistId, setPendingPlaylistId] = useState<string | null>(
    null,
  );

  useEffect(() => {
    let isDisposed = false;

    const loadPlaylists = async () => {
      const storageReady = await verifySavedRehearsalLibraryStorage();

      if (isDisposed) {
        return;
      }

      if (!storageReady) {
        setIssue(STORAGE_UNAVAILABLE_ISSUE);
        setIsLoading(false);
        return;
      }

      const nextPlaylists = await loadSavedPlaylists(
        practiceRepository,
        LOCAL_REHEARSAL_LIBRARY_OWNER_ID,
      );

      if (isDisposed) {
        return;
      }

      setSavedPlaylists(nextPlaylists);
      setIssue(null);
      setIsLoading(false);
    };

    void loadPlaylists();

    return () => {
      isDisposed = true;
    };
  }, []);

  const persistPlaylist = async (playlist: Playlist) => {
    if (issue?.kind === 'storage') {
      return null;
    }

    setPendingPlaylistId(playlist.id);
    setIssue(null);

    try {
      const nextPlaylists = await practiceRepository.savePlaylist(playlist);

      setSavedPlaylists(nextPlaylists);
      return nextPlaylists.find((currentPlaylist) => {
        return currentPlaylist.id === playlist.id;
      }) ?? playlist;
    } catch (error) {
      setIssue(createMutationIssue('save', playlist, error));
      return null;
    } finally {
      setPendingPlaylistId((currentPlaylistId) => {
        return currentPlaylistId === playlist.id ? null : currentPlaylistId;
      });
    }
  };

  return {
    canMutatePlaylists: issue?.kind !== 'storage',
    createPlaylist: persistPlaylist,
    async deletePlaylist(playlist: Playlist) {
      if (issue?.kind === 'storage') {
        return false;
      }

      setPendingPlaylistId(playlist.id);
      setIssue(null);

      try {
        const nextPlaylists = await practiceRepository.deletePlaylist(
          playlist.ownerId,
          playlist.id,
        );

        setSavedPlaylists(nextPlaylists);
        return true;
      } catch (error) {
        setIssue(createMutationIssue('delete', playlist, error));
        return false;
      } finally {
        setPendingPlaylistId((currentPlaylistId) => {
          return currentPlaylistId === playlist.id ? null : currentPlaylistId;
        });
      }
    },
    isLoading,
    issue,
    pendingPlaylistId,
    savedPlaylists,
    updatePlaylist: persistPlaylist,
  };
};