import type { NamedLoop } from '@org/audio-library-models';
import { useCallback } from 'react';

import type { SavedRehearsalLibraryView } from '../../saved-rehearsal-library/detail-mode';
import type { UseLibraryFilesResult } from '../../saved-rehearsal-library/use-library-files';
import {
  createLibraryFilesSuccessFeedback,
  type LibraryFilesSuccessFeedback,
} from './library-files-success-feedback';

type LibraryFilesLoopSaveController = Pick<
  UseLibraryFilesResult,
  'explorer' | 'moveFileLink' | 'rootFolderId'
>;

type SaveLoopWithFilesLocationOptions = {
  detailMode: 'browse' | 'playlist-detail' | 'tag-detail' | 'track-loop-detail';
  isEditingLoop: boolean;
  isSearchPanelVisible: boolean;
  libraryFiles: LibraryFilesLoopSaveController;
  loop: NamedLoop;
  onShowFilesSuccessFeedback?: (feedback: LibraryFilesSuccessFeedback) => void;
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
  onShowFilesSuccessFeedback,
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
  const currentFolderName =
    libraryFiles.explorer?.currentFolder.name ?? 'Files';
  const rootFolderId = libraryFiles.rootFolderId;

  if (!currentFolderId || !rootFolderId || currentFolderId === rootFolderId) {
    onShowFilesSuccessFeedback?.(
      createLibraryFilesSuccessFeedback({
        message: `${loop.name} was saved in ${currentFolderName}.`,
        title: 'Loop saved',
      }),
    );
    return true;
  }

  const moveResult = await libraryFiles.moveFileLink({
    destinationFolderId: currentFolderId,
    fileLink: {
      entityId: loop.id,
      entityKind: 'loop',
      id: `file-link:loop:${loop.id}`,
      parentFolderId: rootFolderId,
    },
  });

  if (moveResult.didComplete) {
    onShowFilesSuccessFeedback?.(
      createLibraryFilesSuccessFeedback({
        message: `${loop.name} was saved in ${currentFolderName}.`,
        title: 'Loop saved',
      }),
    );
  }

  return moveResult.didComplete;
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
      options.onShowFilesSuccessFeedback,
      options.saveLoop,
      options.selectedView,
    ],
  );
};
