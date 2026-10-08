import type {
  Playlist,
  RehearsalLibraryFileTree,
} from '@org/audio-library-models';

import type {
  FolderChild,
  PlaybackExpansionContext,
  PlaybackRef,
} from './playback-expansion';

type CreatePlaybackExpansionContextOptions = {
  /**
   * Puts a folder's children in the Files view's current sort order. Defaults
   * to the tree's own order (subfolders, then links).
   */
  orderChildren?: (
    folderId: string,
    children: readonly FolderChild[],
  ) => readonly FolderChild[];
  playlists: readonly Pick<Playlist, 'id' | 'items'>[];
  tree: RehearsalLibraryFileTree;
};

const toFolderChild = (
  link: RehearsalLibraryFileTree['fileLinks'][number],
): FolderChild => ({ entityId: link.entityId, kind: link.entityKind });

// A playlist entry plays its track, or its loop when it has one.
const toPlaybackRef = (
  entry: Playlist['items'][number],
): PlaybackRef | null => {
  if (entry.kind === 'loop') {
    return entry.loopId === undefined
      ? null
      : { entityId: entry.loopId, kind: 'loop' };
  }

  return { entityId: entry.sourceId, kind: 'track' };
};

/** The expansion context over the saved Files tree and playlists. */
export const createPlaybackExpansionContext = ({
  orderChildren,
  playlists,
  tree,
}: CreatePlaybackExpansionContextOptions): PlaybackExpansionContext => {
  const playlistsById = new Map(
    playlists.map((playlist) => [playlist.id, playlist]),
  );

  return {
    getFolderChildren: (folderId) => {
      const children: FolderChild[] = [
        ...tree.folders
          .filter((folder) => folder.parentFolderId === folderId)
          .map(
            (folder): FolderChild => ({
              folderId: folder.id,
              kind: 'folder',
            }),
          ),
        ...tree.fileLinks
          .filter((link) => link.parentFolderId === folderId)
          .map(toFolderChild),
      ];

      return orderChildren ? orderChildren(folderId, children) : children;
    },
    getPlaylistRefs: (playlistId) =>
      [...(playlistsById.get(playlistId)?.items ?? [])]
        .sort((first, second) => first.sortIndex - second.sortIndex)
        .flatMap((entry) => toPlaybackRef(entry) ?? []),
  };
};
