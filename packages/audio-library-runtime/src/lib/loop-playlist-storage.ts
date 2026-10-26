import {
  normalizePlaylist,
  withResolvedTagAddedAt,
  type NamedLoop,
  type Playlist,
} from '@org/audio-library-models';
import { filter, sortBy } from 'es-toolkit/compat';

import { normalizeStoredLoops } from './async-storage-practice-repository-helpers';
import type { PracticeRepository } from './practice-repository';
import {
  persistSynchronizedLibraryFileTree,
  writeStoredCollection,
} from './practice-repository-storage';

export async function saveLoopToRepository(
  repository: PracticeRepository,
  loop: NamedLoop,
) {
  const normalizedLoop = normalizeStoredLoops({
    loops: [loop],
    sources: await repository.listSources(loop.ownerId),
  })[0];

  if (!normalizedLoop) {
    throw new Error(
      'Saved loops must preserve parent-track context through sourceId and sourceName.',
    );
  }

  const loops = await repository.listLoops(loop.ownerId);
  const priorLoop = loops.find(
    (existingLoop) => existingLoop.id === normalizedLoop.id,
  );
  const loopToSave: NamedLoop = withResolvedTagAddedAt(
    normalizedLoop,
    priorLoop?.tagAddedAt,
    new Date().toISOString(),
  );
  const otherLoops = filter(
    loops,
    (existingLoop) => existingLoop.id !== loopToSave.id,
  );
  const nextLoops = sortBy([...otherLoops, loopToSave], ['name']);

  await writeStoredCollection('loops', loop.ownerId, nextLoops);
  await persistSynchronizedLibraryFileTree(repository, loop.ownerId, {
    loops: nextLoops,
    playlists: await repository.listPlaylists(loop.ownerId),
    sources: await repository.listSources(loop.ownerId),
  });

  return nextLoops;
}

export async function deleteLoopFromRepository(
  repository: PracticeRepository,
  ownerId: string,
  loopId: string,
) {
  const loops = await repository.listLoops(ownerId);
  const nextLoops = filter(loops, (loop) => loop.id !== loopId);

  await writeStoredCollection('loops', ownerId, nextLoops);
  await persistSynchronizedLibraryFileTree(repository, ownerId, {
    loops: nextLoops,
    playlists: await repository.listPlaylists(ownerId),
    sources: await repository.listSources(ownerId),
  });

  return nextLoops;
}

export async function savePlaylistToRepository(
  repository: PracticeRepository,
  playlist: Playlist,
) {
  const normalizedPlaylist = normalizePlaylist(playlist);
  const { ownerId } = normalizedPlaylist;
  const playlists = await repository.listPlaylists(ownerId);
  const priorPlaylist = playlists.find(
    (existingPlaylist) => existingPlaylist.id === normalizedPlaylist.id,
  );
  const playlistToSave: Playlist = withResolvedTagAddedAt(
    normalizedPlaylist,
    priorPlaylist?.tagAddedAt,
    new Date().toISOString(),
  );
  const otherPlaylists = filter(
    playlists,
    (existingPlaylist) => existingPlaylist.id !== playlistToSave.id,
  );
  const nextPlaylists = sortBy([...otherPlaylists, playlistToSave], ['name']);

  await writeStoredCollection('playlists', ownerId, nextPlaylists);
  await persistSynchronizedLibraryFileTree(repository, ownerId, {
    loops: await repository.listLoops(ownerId),
    playlists: nextPlaylists,
    sources: await repository.listSources(ownerId),
  });

  return nextPlaylists;
}

export async function deletePlaylistFromRepository(
  repository: PracticeRepository,
  ownerId: string,
  playlistId: string,
) {
  const playlists = await repository.listPlaylists(ownerId);
  const nextPlaylists = filter(
    playlists,
    (playlist) => playlist.id !== playlistId,
  );

  await writeStoredCollection('playlists', ownerId, nextPlaylists);
  await persistSynchronizedLibraryFileTree(repository, ownerId, {
    loops: await repository.listLoops(ownerId),
    playlists: nextPlaylists,
    sources: await repository.listSources(ownerId),
  });

  return nextPlaylists;
}
