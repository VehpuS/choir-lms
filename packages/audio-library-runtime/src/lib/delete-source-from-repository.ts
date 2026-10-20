import { normalizePlaylist } from '@org/audio-library-models';
import { filter } from 'es-toolkit/compat';

import type { PracticeRepository } from './practice-repository';
import {
  persistSynchronizedLibraryFileTree,
  writeStoredCollection,
} from './practice-repository-storage';

/**
 * Removes a saved track together with everything that depends on it: its
 * adjusted tracks, their loops, and the playlist entries pointing at any of
 * them. Lyrics, sheet music, and markers live on the track record, so they go with it.
 */
export const deleteSourceFromRepository = async (
  repository: PracticeRepository,
  ownerId: string,
  sourceId: string,
) => {
  const sources = await repository.listSources(ownerId);
  const loops = await repository.listLoops(ownerId);
  const playlists = await repository.listPlaylists(ownerId);
  // Adjusted tracks have no audio of their own, so they go with their source
  // the same way its loops do.
  const removedSourceIds = new Set([
    sourceId,
    ...sources
      .filter((source) => source.adjustment?.sourceRef === sourceId)
      .map((source) => source.id),
  ]);
  const nextSources = filter(
    sources,
    (source) => !removedSourceIds.has(source.id),
  );
  const nextLoops = filter(
    loops,
    (loop) => !removedSourceIds.has(loop.sourceId),
  );
  const nextPlaylists = playlists.map((playlist) => {
    return normalizePlaylist({
      ...playlist,
      items: playlist.items.filter(
        (item) => !removedSourceIds.has(item.sourceId),
      ),
    });
  });

  await writeStoredCollection('loops', ownerId, nextLoops);
  await writeStoredCollection('playlists', ownerId, nextPlaylists);
  await writeStoredCollection('sources', ownerId, nextSources);
  await persistSynchronizedLibraryFileTree(repository, ownerId, {
    loops: nextLoops,
    playlists: nextPlaylists,
    sources: nextSources,
  });

  return nextSources;
};
