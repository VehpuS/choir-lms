import type { NamedLoop } from '@org/audio-library-models';

import type { DriveLibrarySource } from '../../drive/utils/drive-library-view-model';
import type { PlaylistState } from './browse-content-types';
import type { FilesPlaylistAddMode } from './files-view-model';

/**
 * Files' playlist add mode is active while a playlist is collecting items
 * from Files; each row's `Add` resolves the saved entity by id and appends it
 * to that playlist.
 */
export const resolveFilesPlaylistAddMode = (options: {
  canMutatePlaylists: boolean;
  isPlaylistMutating: boolean;
  isSavedLibraryMutating: boolean;
  onDone: () => void;
  playlistState: PlaylistState;
  savedLibrarySources: DriveLibrarySource[];
  savedLoops: NamedLoop[];
}): FilesPlaylistAddMode | undefined => {
  const { playlistState } = options;

  if (
    !playlistState.isFilesAddItemsVisible ||
    playlistState.selectedPlaylist === null
  ) {
    return undefined;
  }

  return {
    canMutatePlaylists: options.canMutatePlaylists,
    isPlaylistMutating: options.isPlaylistMutating,
    isSavedLibraryMutating: options.isSavedLibraryMutating,
    onAddLoop: (loopId) => {
      const loop = options.savedLoops.find((currentLoop) => {
        return currentLoop.id === loopId;
      });

      if (!loop) {
        return;
      }

      void playlistState.addLoopToSelectedPlaylist(loop);
    },
    onAddSource: (sourceId) => {
      const source = options.savedLibrarySources.find((currentSource) => {
        return currentSource.id === sourceId;
      });

      if (!source) {
        return;
      }

      void playlistState.addSourceToSelectedPlaylist(source);
    },
    onDone: options.onDone,
    playlistName: playlistState.selectedPlaylist.name,
  };
};
