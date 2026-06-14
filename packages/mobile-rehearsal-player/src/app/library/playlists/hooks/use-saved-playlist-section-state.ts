import { renamePlaylist, type Playlist } from '@org/audio-library-models';
import { useEffect, useReducer, useRef, useState } from 'react';
import { Alert } from 'react-native';

import {
  buildSavedPlaylistDetailDraftPlaylist,
  getSavedPlaylistDetailInitialState,
  getSavedPlaylistDetailItemRemovalCopy,
  hasSavedPlaylistDetailEntryOrderChanged,
  moveSavedPlaylistDetailEntry,
  reduceSavedPlaylistDetailState,
  removeSavedPlaylistDetailEntry,
  restoreSavedPlaylistDetailEntry,
} from '../utils/saved-playlist-detail-view-model';
import {
  buildSavedPlaylist,
  getSavedPlaylistRemovalCopy,
  validatePlaylistName,
  type PlaylistDraftIssue,
} from '../utils/saved-playlist-view-model';
import { LOCAL_REHEARSAL_LIBRARY_OWNER_ID } from '../../storage/local-library-storage';

type PlaylistEntry = Playlist['items'][number];

type UseSavedPlaylistSectionStateOptions = {
  createPlaylist: (playlist: Playlist) => Promise<Playlist | null>;
  deletePlaylist: (playlist: Playlist) => Promise<boolean>;
  isDetailVisible: boolean;
  onCloseDetail?: () => void;
  pendingPlaylistId: string | null;
  selectedPlaylist: Playlist | null;
  setIsReorderDragActive: (isActive: boolean) => void;
  setSelectedPlaylistId: (playlistId: string) => void;
  updatePlaylist: (playlist: Playlist) => Promise<Playlist | null>;
};

export const useSavedPlaylistSectionState = (
  options: UseSavedPlaylistSectionStateOptions,
) => {
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
    setRenamePlaylistName(options.selectedPlaylist?.name ?? '');
    setRenameIssue(null);
  }, [options.selectedPlaylist?.id, options.selectedPlaylist?.name]);

  useEffect(() => {
    resetDetailEntries(
      options.isDetailVisible ? (options.selectedPlaylist?.items ?? []) : [],
    );
  }, [options.isDetailVisible, options.selectedPlaylist?.id]);

  const isMutating = options.pendingPlaylistId !== null;

  const persistSelectedPlaylist = async (
    buildNextPlaylist: (playlist: Playlist) => Playlist,
  ) => {
    if (!options.selectedPlaylist) {
      return;
    }

    const persistedPlaylist = await options.updatePlaylist(
      buildNextPlaylist(options.selectedPlaylist),
    );

    if (persistedPlaylist) {
      options.setSelectedPlaylistId(persistedPlaylist.id);
    }

    return persistedPlaylist;
  };

  const persistPlaylistDetailEntries = async (entries: PlaylistEntry[]) => {
    if (!options.selectedPlaylist) {
      return;
    }

    if (
      !hasSavedPlaylistDetailEntryOrderChanged(
        entries,
        options.selectedPlaylist.items,
      )
    ) {
      return;
    }

    const persistedPlaylist = await persistSelectedPlaylist((playlist) => {
      return buildSavedPlaylistDetailDraftPlaylist(playlist, entries);
    });

    if (!persistedPlaylist) {
      resetDetailEntries(options.selectedPlaylist.items);
      return;
    }

    resetDetailEntries(persistedPlaylist.items);
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

    const persistedPlaylist = await options.createPlaylist(result.playlist);

    if (!persistedPlaylist) {
      return;
    }

    setCreationIssue(null);
    setCreatePlaylistName('');
    options.setSelectedPlaylistId(persistedPlaylist.id);
  };

  const handleRenamePlaylist = async () => {
    if (!options.selectedPlaylist) {
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
    const selectedPlaylist = options.selectedPlaylist;

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
          void options.deletePlaylist(selectedPlaylist);
        },
      },
    ]);
  };

  const handleRemovePlaylistItem = async (entryId: string) => {
    const selectedPlaylist = options.selectedPlaylist;

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
    if (!options.selectedPlaylist || !detailState.removalNotice) {
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

  const handleMoveItem = (
    fromIndex: number,
    toIndex: number,
    reorderOptions?: { persist?: boolean },
  ) => {
    const nextEntries = moveSavedPlaylistDetailEntry(
      detailEntriesRef.current,
      fromIndex,
      toIndex,
    );

    if (nextEntries === detailEntriesRef.current) {
      return;
    }

    setDraftEntries(nextEntries);

    if (reorderOptions?.persist) {
      void persistPlaylistDetailEntries(nextEntries);
    }
  };

  return {
    createPlaylistName,
    creationIssue,
    detailDraftEntries: detailState.draftEntries,
    handleCloseDetail: () => {
      options.setIsReorderDragActive(false);
      resetDetailEntries([]);
      options.onCloseDetail?.();
    },
    handleCommitReorder: () => {
      void persistPlaylistDetailEntries(detailEntriesRef.current);
    },
    handleCreatePlaylist,
    handleCreatePlaylistNameChange: (value: string) => {
      setCreatePlaylistName(value);
      setCreationIssue(null);
    },
    handleDeletePlaylist,
    handleDismissRemovalNotice: () => {
      dispatchDetailAction({
        type: 'clear-removal-notice',
      });
    },
    handleMoveItem,
    handleRemovePlaylistItem,
    handleRenamePlaylist,
    handleRenamePlaylistNameChange: (value: string) => {
      setRenamePlaylistName(value);
      setRenameIssue(null);
    },
    handleUndoPlaylistRemoval,
    isMutating,
    removalNotice: detailState.removalNotice,
    renameIssue,
    renamePlaylistName,
  };
};
