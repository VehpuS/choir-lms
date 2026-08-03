import type { Playlist } from '@org/audio-library-models';

import type { UseLibraryFilesResult } from '../../library/saved-rehearsal-library/use-library-files';

type LibraryFilesPlaylistCreateController = Pick<
  UseLibraryFilesResult,
  'explorer' | 'moveFileLink' | 'rootFolderId'
>;

type CreatePlaylistWithFilesLocationOptions = {
  createPlaylist: (playlist: Playlist) => Promise<Playlist | null>;
  files: LibraryFilesPlaylistCreateController;
  playlist: Playlist;
};

export const createPlaylistWithFilesLocation = async ({
  createPlaylist,
  files,
  playlist,
}: CreatePlaylistWithFilesLocationOptions) => {
  const createdPlaylist = await createPlaylist(playlist);

  if (!createdPlaylist) {
    return null;
  }

  const currentFolderId = files.explorer?.currentFolder.id ?? null;
  const rootFolderId = files.rootFolderId;

  if (!currentFolderId || !rootFolderId || currentFolderId === rootFolderId) {
    return createdPlaylist;
  }

  const moveResult = await files.moveFileLink({
    destinationFolderId: currentFolderId,
    fileLink: {
      entityId: createdPlaylist.id,
      entityKind: 'playlist',
      id: `file-link:playlist:${createdPlaylist.id}`,
      parentFolderId: rootFolderId,
    },
  });

  return moveResult.didComplete ? createdPlaylist : null;
};
