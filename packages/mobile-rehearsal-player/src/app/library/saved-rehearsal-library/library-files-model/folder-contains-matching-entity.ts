import type {
  NamedLoop,
  Playlist,
  RehearsalLibraryFileTree,
} from '@org/audio-library-models';
import { resolveRehearsalLibraryFolderSubtreeIds } from '@org/audio-library-runtime';

import type { DriveLibrarySource } from '../../drive/utils/drive-library-view-model';
import {
  matchesEntityFilter,
  matchesSelectedTags,
  type LibrarySearchEntityFilter,
} from '../../search/utils/saved-library-search-view-model';

export const folderContainsMatchingEntity = (options: {
  entityFilter: LibrarySearchEntityFilter;
  folderId: string;
  savedLoopsById: ReadonlyMap<string, NamedLoop>;
  savedPlaylistsById: ReadonlyMap<string, Playlist>;
  savedSourcesById: ReadonlyMap<string, DriveLibrarySource>;
  selectedTags: string[];
  tree: RehearsalLibraryFileTree;
}) => {
  const subtreeFolderIds = resolveRehearsalLibraryFolderSubtreeIds(
    options.folderId,
    options.tree.folders,
  );

  return options.tree.fileLinks.some((fileLink) => {
    if (!subtreeFolderIds.has(fileLink.parentFolderId)) {
      return false;
    }

    if (fileLink.entityKind === 'track') {
      if (!matchesEntityFilter(options.entityFilter, 'tracks')) {
        return false;
      }

      const source = options.savedSourcesById.get(fileLink.entityId);

      return (
        !!source &&
        matchesSelectedTags({
          matchMode: 'all',
          selectedTags: options.selectedTags,
          tags: source.tags,
        })
      );
    }

    if (fileLink.entityKind === 'loop') {
      if (!matchesEntityFilter(options.entityFilter, 'loops')) {
        return false;
      }

      const loop = options.savedLoopsById.get(fileLink.entityId);

      return (
        !!loop &&
        matchesSelectedTags({
          matchMode: 'all',
          selectedTags: options.selectedTags,
          tags: loop.tags,
        })
      );
    }

    if (!matchesEntityFilter(options.entityFilter, 'playlists')) {
      return false;
    }

    const playlist = options.savedPlaylistsById.get(fileLink.entityId);

    return (
      !!playlist &&
      matchesSelectedTags({
        matchMode: 'all',
        selectedTags: options.selectedTags,
        tags: playlist.tags,
      })
    );
  });
};
