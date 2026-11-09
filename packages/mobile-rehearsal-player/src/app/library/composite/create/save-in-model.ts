import type { RehearsalLibraryFileTree } from '@org/audio-library-models';
import { resolveCompositeFolderId } from '@org/audio-library-runtime';

import { buildLibraryFolderPathLabel } from '../../saved-rehearsal-library/library-files-model';

/**
 * The `Save in` choice on the create sheet (composite-tracks 7.5): every
 * folder by its path, the library root first, and the folder of the first
 * selected track's file as the default.
 */

export type SaveInFolder = { id: string; label: string };

export type SaveInOptions = {
  defaultFolderId: string;
  folders: SaveInFolder[];
};

export const resolveSaveInOptions = (
  tree: RehearsalLibraryFileTree,
  trackIds: readonly string[],
): SaveInOptions => {
  const foldersById = new Map(
    tree.folders.map((folder) => [folder.id, folder]),
  );
  const folders = tree.folders
    .map((folder) => ({
      id: folder.id,
      label: buildLibraryFolderPathLabel(foldersById, folder),
    }))
    .sort((first, second) => {
      // The root reads as the whole library, so it leads.
      if (first.id === tree.rootFolderId) {
        return -1;
      }

      return second.id === tree.rootFolderId
        ? 1
        : first.label.localeCompare(second.label);
    });

  return {
    defaultFolderId: resolveCompositeFolderId(tree, trackIds),
    folders,
  };
};
