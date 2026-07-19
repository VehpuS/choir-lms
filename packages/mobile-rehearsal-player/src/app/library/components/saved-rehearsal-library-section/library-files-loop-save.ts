import type { NamedLoop } from '@org/audio-library-models';
import { useCallback } from 'react';

import type { SavedRehearsalLibraryView } from '../../saved-rehearsal-library/detail-mode';

type LibraryFilesLoopSaveController = {
  explorer: { currentFolder: { id: string } } | null;
  moveFileLink: (options: {
    destinationFolderId: string;
    fileLink: {
      entityId: string;
      entityKind: 'loop';
      id: string;
      parentFolderId: string;
    };
  }) => Promise<boolean>;
  rootFolderId: string | null;
};

type SaveLoopWithFilesLocationOptions = {
  detailMode: 'browse' | 'playlist-detail' | 'track-loop-detail';
  isEditingLoop: boolean;
  isSearchPanelVisible: boolean;
  libraryFiles: LibraryFilesLoopSaveController;
  loop: NamedLoop;
  saveLoop: (loop: NamedLoop) => Promise<boolean>;
  selectedView: SavedRehearsalLibraryView;
};

type UseLoopSaveWithFilesLocationOptions = Omit<
  SaveLoopWithFilesLocationOptions,
  'loop'
>;

export const saveLoopWithFilesLocation = async ({
  detailMode,
  isEditingLoop,
  isSearchPanelVisible,
  libraryFiles,
  loop,
  saveLoop,
  selectedView,
}: SaveLoopWithFilesLocationOptions) => {
  const didSave = await saveLoop(loop);

  if (!didSave || isEditingLoop) {
    return didSave;
  }

  if (
    selectedView !== 'files' ||
    isSearchPanelVisible ||
    detailMode !== 'browse'
  ) {
    return true;
  }

  const currentFolderId = libraryFiles.explorer?.currentFolder.id ?? null;
  const rootFolderId = libraryFiles.rootFolderId;

  if (!currentFolderId || !rootFolderId || currentFolderId === rootFolderId) {
    return true;
  }

  return libraryFiles.moveFileLink({
    destinationFolderId: currentFolderId,
    fileLink: {
      entityId: loop.id,
      entityKind: 'loop',
      id: `file-link:loop:${loop.id}`,
      parentFolderId: rootFolderId,
    },
  });
};

export const useLoopSaveWithFilesLocation = (
  options: UseLoopSaveWithFilesLocationOptions,
) => {
  return useCallback(
    (loop: NamedLoop) => {
      return saveLoopWithFilesLocation({
        ...options,
        loop,
      });
    },
    [
      options.detailMode,
      options.isEditingLoop,
      options.isSearchPanelVisible,
      options.libraryFiles,
      options.saveLoop,
      options.selectedView,
    ],
  );
};
