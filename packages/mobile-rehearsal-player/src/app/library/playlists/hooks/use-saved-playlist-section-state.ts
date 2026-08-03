import { type Playlist } from '@org/audio-library-models';
import { useEffect, useReducer, useRef } from 'react';

import { useLibraryFilesConfirmationFlow } from '../../components/saved-rehearsal-library-section/use-library-files-confirmation-flow';
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
import { getSavedPlaylistRemovalCopy } from '../utils/saved-playlist-view-model';
import { useSavedPlaylistCreateDialogState } from './use-saved-playlist-create-dialog-state';
import { useSavedPlaylistRenameState } from './use-saved-playlist-rename-state';

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
  const [detailState, dispatchDetailAction] = useReducer(
    reduceSavedPlaylistDetailState,
    undefined,
    getSavedPlaylistDetailInitialState,
  );
  const detailEntriesRef = useRef<PlaylistEntry[]>([]);
  const confirmationFlow = useLibraryFilesConfirmationFlow();

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
    resetDetailEntries(
      options.isDetailVisible ? (options.selectedPlaylist?.items ?? []) : [],
    );
  }, [options.isDetailVisible, options.selectedPlaylist?.id]);

  const isMutating = options.pendingPlaylistId !== null;
  const createDialogState = useSavedPlaylistCreateDialogState({
    createPlaylist: options.createPlaylist,
    setSelectedPlaylistId: options.setSelectedPlaylistId,
  });

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
  const renameState = useSavedPlaylistRenameState({
    persistSelectedPlaylist,
    selectedPlaylist: options.selectedPlaylist,
  });

  const handleDeletePlaylist = () => {
    const selectedPlaylist = options.selectedPlaylist;

    if (!selectedPlaylist) {
      return;
    }

    const removalCopy = getSavedPlaylistRemovalCopy(selectedPlaylist);

    confirmationFlow.requestConfirmation({
      content: removalCopy,
      onConfirm: async () => {
        await options.deletePlaylist(selectedPlaylist);
      },
    });
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

    confirmationFlow.requestConfirmation({
      content: removalCopy,
      onConfirm: async () => {
        setDraftEntries(removalResult.nextEntries);

        const persistedPlaylist = await persistSelectedPlaylist((playlist) => {
          return buildSavedPlaylistDetailDraftPlaylist(
            playlist,
            removalResult.nextEntries,
          );
        });

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
      },
    });
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
    ...createDialogState,
    confirmationDialog: confirmationFlow.confirmationDialog,
    ...renameState,
    detailDraftEntries: detailState.draftEntries,
    handleCloseDetail: () => {
      confirmationFlow.requestConfirmation(null);
      options.setIsReorderDragActive(false);
      resetDetailEntries([]);
      options.onCloseDetail?.();
    },
    handleCommitReorder: () => {
      void persistPlaylistDetailEntries(detailEntriesRef.current);
    },
    handleDeletePlaylist,
    handleDismissRemovalNotice: () => {
      dispatchDetailAction({
        type: 'clear-removal-notice',
      });
    },
    handleMoveItem,
    handleRemovePlaylistItem,
    handleUndoPlaylistRemoval,
    isMutating,
    removalNotice: detailState.removalNotice,
  };
};
