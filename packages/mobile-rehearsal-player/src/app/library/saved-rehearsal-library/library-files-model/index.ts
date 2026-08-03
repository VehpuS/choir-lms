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
import type {
  LibraryFilesBreadcrumb,
  LibraryFilesExplorerState,
  LibraryFilesRow,
} from './types';

const normalizeName = (value: string) => {
  return value.toLocaleLowerCase();
};

const sortRowsByLabel = <Row extends { label: string }>(rows: Row[]) => {
  return [...rows].sort((left, right) => {
    return normalizeName(left.label).localeCompare(normalizeName(right.label));
  });
};

const buildBreadcrumbs = (options: {
  currentFolder: RehearsalLibraryFolderNode;
  foldersById: ReadonlyMap<string, RehearsalLibraryFolderNode>;
}): LibraryFilesBreadcrumb[] => {
  const breadcrumbs: LibraryFilesBreadcrumb[] = [];
  let currentFolder: RehearsalLibraryFolderNode | undefined =
    options.currentFolder;

  while (currentFolder) {
    breadcrumbs.unshift({
      folderId: currentFolder.id,
      label: currentFolder.name,
    });

    currentFolder = currentFolder.parentFolderId
      ? options.foldersById.get(currentFolder.parentFolderId)
      : undefined;
  }

  return breadcrumbs;
};

export const buildLibraryFilesExplorerState = (options: {
  currentFolderId: string;
  savedLoops: NamedLoop[];
  savedPlaylists: Playlist[];
  savedSources: DriveLibrarySource[];
  tree: RehearsalLibraryFileTree;
}): LibraryFilesExplorerState => {
  const foldersById = new Map(
    options.tree.folders.map((folder) => {
      return [folder.id, folder] as const;
    }),
  );
  const currentFolder =
    foldersById.get(options.currentFolderId) ??
    foldersById.get(options.tree.rootFolderId) ??
    options.tree.folders[0];

  if (!currentFolder) {
    throw new Error('Library Files requires a root folder.');
  }

  const entityNameByKey = buildEntityNameByKey(options);
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
      return folder.parentFolderId === currentFolder.id;
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
    if (fileLink.parentFolderId !== currentFolder.id) {
      return [] as LibraryFilesRow[];
    }

    if (fileLink.entityKind === 'track') {
      const source = savedSourcesById.get(fileLink.entityId);

      return source
        ? [
            buildTrackRow({
              entityNameByKey,
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
              entityNameByKey,
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
            entityNameByKey,
            fileLink,
            playlist,
          }),
        ]
      : [];
  });

  return {
    breadcrumbs: buildBreadcrumbs({
      currentFolder,
      foldersById,
    }),
    currentFolder,
    rows: [...sortRowsByLabel(childFolders), ...sortRowsByLabel(entityRows)],
  };
};

export type {
  LibraryFilesBreadcrumb,
  LibraryFilesExplorerState,
  LibraryFilesFolderRow,
  LibraryFilesLoopRow,
  LibraryFilesPlaylistRow,
  LibraryFilesRow,
  LibraryFilesTrackRow,
} from './types';