import type { RehearsalLibraryFileTree } from '@org/audio-library-models';

import type { UseLibraryFilesOptions } from './library-files-operation-helpers';

// What removing a track from the library takes with it: its adjusted tracks,
// every file link to them, the loops cut from them, and the playlist entries
// that play them.
export const getTrackRemoveFromLibraryImpact = (
  tree: RehearsalLibraryFileTree | null,
  options: Pick<
    UseLibraryFilesOptions,
    'savedLoops' | 'savedPlaylists' | 'savedSources'
  >,
  sourceId: string,
) => {
  const foldersById = new Map(
    tree?.folders.map((folder) => {
      return [folder.id, folder] as const;
    }) ?? [],
  );
  const source = options.savedSources.find((savedSource) => {
    return savedSource.id === sourceId;
  });
  // Removing a track also removes its adjusted tracks, so their links,
  // loops, and playlist entries go with it and are listed too.
  const adjustedTracks = options.savedSources.filter((savedSource) => {
    return savedSource.adjustment?.sourceRef === sourceId;
  });
  const removedSourceIds = new Set([
    sourceId,
    ...adjustedTracks.map(({ id }) => id),
  ]);
  const fileLinks =
    tree?.fileLinks.filter((fileLink) => {
      return (
        fileLink.entityKind === 'track' &&
        removedSourceIds.has(fileLink.entityId)
      );
    }) ?? [];
  const loops = options.savedLoops.filter((loop) => {
    return removedSourceIds.has(loop.sourceId);
  });
  const playlistEntries = options.savedPlaylists.flatMap((playlist) => {
    return playlist.items
      .filter((item) => {
        return removedSourceIds.has(item.sourceId);
      })
      .map((item) => {
        return `${playlist.name}: ${item.title}`;
      });
  });

  return {
    adjustedTrackCount: adjustedTracks.length,
    adjustedTrackNames: adjustedTracks.map((track) => track.name),
    fileLinkCount: fileLinks.length,
    fileLinkNames: fileLinks.map((fileLink) => {
      const displayName =
        fileLink.visibleName ??
        options.savedSources.find(({ id }) => id === fileLink.entityId)?.name ??
        source?.name ??
        'Track';
      const folderName = foldersById.get(fileLink.parentFolderId)?.name;

      return folderName ? `${displayName} (${folderName})` : displayName;
    }),
    loopCount: loops.length,
    loopNames: loops.map((loop) => loop.name),
    playlistEntryCount: playlistEntries.length,
    playlistEntryTitles: playlistEntries,
  };
};
