import { useCallback } from 'react';

import type { SavedRehearsalLibraryView } from '../../saved-rehearsal-library/detail-mode';
import type { UseLibraryFilesResult } from '../../saved-rehearsal-library/use-library-files';
import type { useSavedRehearsalLibraryPlaylistState } from './use-saved-rehearsal-library-playlist-state';

type OpenFilesAddItemsOptions = {
  playlistId?: string;
  preferredFolderId?: string | null;
};

type UsePlaylistFilesAddItemsOptions = {
  clearLibrarySearch: () => void;
  libraryFiles: UseLibraryFilesResult;
  playlistState: Pick<
    ReturnType<typeof useSavedRehearsalLibraryPlaylistState>,
    | 'closeFilesAddItems'
    | 'closePlaylistDetail'
    | 'openFilesAddItems'
    | 'openPlaylistDetail'
    | 'playlistDetailOrigin'
    | 'selectedPlaylist'
  >;
  setSelectedView: (view: SavedRehearsalLibraryView) => void;
};

export const usePlaylistFilesAddItems = ({
  clearLibrarySearch,
  libraryFiles,
  playlistState,
  setSelectedView,
}: UsePlaylistFilesAddItemsOptions) => {
  const handleClosePlaylistDetail = useCallback(() => {
    const detailOrigin = playlistState.playlistDetailOrigin;

    playlistState.closePlaylistDetail();

    if (!detailOrigin) {
      return;
    }

    setSelectedView(detailOrigin.view);

    if (detailOrigin.view === 'files' && detailOrigin.filesFolderId) {
      libraryFiles.goToFolder(detailOrigin.filesFolderId);
    }
  }, [libraryFiles, playlistState, setSelectedView]);

  const handleOpenFilesAddItems = useCallback(
    (options: OpenFilesAddItemsOptions = {}) => {
      const playlistId =
        options.playlistId ?? playlistState.selectedPlaylist?.id;

      if (!playlistId) {
        return;
      }

      const detailOrigin = playlistState.playlistDetailOrigin;
      const targetFolderId =
        options.preferredFolderId ??
        (detailOrigin?.view === 'files' ? detailOrigin.filesFolderId : null) ??
        libraryFiles.rootFolderId;

      clearLibrarySearch();
      playlistState.openFilesAddItems(playlistId);
      playlistState.closePlaylistDetail();
      setSelectedView('files');

      if (targetFolderId) {
        libraryFiles.goToFolder(targetFolderId);
      }
    },
    [clearLibrarySearch, libraryFiles, playlistState, setSelectedView],
  );

  const handleDoneAddingFilesPlaylistItems = useCallback(() => {
    const currentFolder = libraryFiles.explorer?.currentFolder;
    const selectedPlaylist = playlistState.selectedPlaylist;

    playlistState.closeFilesAddItems();

    if (!selectedPlaylist) {
      return;
    }

    playlistState.openPlaylistDetail(selectedPlaylist.id, {
      originFilesFolderId: currentFolder?.id ?? null,
      originFilesFolderName: currentFolder?.name ?? null,
      originView: 'files',
    });
  }, [libraryFiles.explorer, playlistState]);

  return {
    handleClosePlaylistDetail,
    handleDoneAddingFilesPlaylistItems,
    handleOpenFilesAddItems,
  };
};
