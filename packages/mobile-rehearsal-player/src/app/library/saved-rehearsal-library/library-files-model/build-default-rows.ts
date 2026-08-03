import type {
  NamedLoop,
  Playlist,
  RehearsalLibraryFileTree,
  RehearsalLibraryFolderNode,
} from '@org/audio-library-models';

import type { DriveLibrarySource } from '../../drive/utils/drive-library-view-model';
import {
  buildEntityNameByKey,
  buildFolderChildCounts,
  buildFolderRow,
  buildLoopRow,
  buildPlaylistRow,
  buildTrackRow,
} from './row-builders';
import { sortRows } from './sort';
import type { LibraryFilesRow, LibraryFilesSortMode } from './types';

export const buildDefaultRows = (options: {
  currentFolder: RehearsalLibraryFolderNode;
  entityNameByKey: ReturnType<typeof buildEntityNameByKey>;
  openedAtByNodeKey?: Readonly<Record<string, string>>;
  savedLoops: NamedLoop[];
  savedPlaylists: Playlist[];
  savedSources: DriveLibrarySource[];
  sortMode?: LibraryFilesSortMode;
  tree: RehearsalLibraryFileTree;
}) => {
  const savedSourcesById = new Map(
    options.savedSources.map((source) => {
      return [source.id, source] as const;
    }),
  );
  const savedLoopsById = new Map(
    options.savedLoops.map((loop) => {
      return [loop.id, loop] as const;
    }),
  );
  const savedPlaylistsById = new Map(
    options.savedPlaylists.map((playlist) => {
      return [playlist.id, playlist] as const;
    }),
  );
  const childFolders = options.tree.folders
    .filter((folder) => {
      return folder.parentFolderId === options.currentFolder.id;
    })
    .map((folder) => {
      return buildFolderRow({
        childCounts: buildFolderChildCounts({
          folderId: folder.id,
          tree: options.tree,
        }),
        folder,
      });
    });
  const entityRows = options.tree.fileLinks.flatMap((fileLink) => {
    if (fileLink.parentFolderId !== options.currentFolder.id) {
      return [] as LibraryFilesRow[];
    }

    if (fileLink.entityKind === 'track') {
      const source = savedSourcesById.get(fileLink.entityId);

      return source
        ? [
            buildTrackRow({
              entityNameByKey: options.entityNameByKey,
              fileLink,
              source,
            }),
          ]
        : [];
    }

    if (fileLink.entityKind === 'loop') {
      const loop = savedLoopsById.get(fileLink.entityId);

      return loop
        ? [
            buildLoopRow({
              entityNameByKey: options.entityNameByKey,
              fileLink,
              loop,
              source: savedSourcesById.get(loop.sourceId) ?? null,
            }),
          ]
        : [];
    }

    const playlist = savedPlaylistsById.get(fileLink.entityId);

    return playlist
      ? [
          buildPlaylistRow({
            entityNameByKey: options.entityNameByKey,
            fileLink,
            playlist,
          }),
        ]
      : [];
  });

  return sortRows({
    openedAtByNodeKey: options.openedAtByNodeKey,
    rows: [...childFolders, ...entityRows],
    sortMode: options.sortMode,
  });
};
