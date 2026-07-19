import type { Playlist } from '@org/audio-library-models';

type LibraryFilesPlaylistCreateController = {
  explorer: { currentFolder: { id: string } } | null;
  moveFileLink: (options: {
    destinationFolderId: string;
    fileLink: {
      entityId: string;
      entityKind: 'playlist';
      id: string;
      parentFolderId: string;
    };
  }) => Promise<boolean>;
  rootFolderId: string | null;
};

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

  const didMove = await files.moveFileLink({
    destinationFolderId: currentFolderId,
    fileLink: {
      entityId: createdPlaylist.id,
      entityKind: 'playlist',
      id: `file-link:playlist:${createdPlaylist.id}`,
      parentFolderId: rootFolderId,
    },
  });

  return didMove ? createdPlaylist : null;
};
