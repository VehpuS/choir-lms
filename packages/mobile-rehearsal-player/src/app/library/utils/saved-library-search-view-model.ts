import type { NamedLoop, Playlist } from '@org/audio-library-models';

import type { DriveLibrarySource } from './drive-library-view-model';

const normalizeQuery = (value: string) => {
  return value.trim().toLocaleLowerCase();
};

const includesQuery = (value: string, query: string) => {
  return value.toLocaleLowerCase().includes(query);
};

export const resolveActiveLibrarySearchQuery = (query: string) => {
  const nextQuery = query.trim();

  return nextQuery.length > 0 ? nextQuery : null;
};

export const filterSavedLibrarySourcesByQuery = (options: {
  activeSearchQuery: string | null;
  sources: DriveLibrarySource[];
}) => {
  const normalizedQuery = normalizeQuery(options.activeSearchQuery ?? '');

  if (!normalizedQuery) {
    return options.sources;
  }

  return options.sources.filter((source) => {
    return includesQuery(source.name, normalizedQuery);
  });
};

export const filterSavedLoopsByQuery = (options: {
  activeSearchQuery: string | null;
  loops: NamedLoop[];
}) => {
  const normalizedQuery = normalizeQuery(options.activeSearchQuery ?? '');

  if (!normalizedQuery) {
    return options.loops;
  }

  return options.loops.filter((loop) => {
    return (
      includesQuery(loop.name, normalizedQuery) ||
      includesQuery(loop.sourceName, normalizedQuery)
    );
  });
};

export const filterSavedPlaylistsByQuery = (options: {
  activeSearchQuery: string | null;
  playlists: Playlist[];
}) => {
  const normalizedQuery = normalizeQuery(options.activeSearchQuery ?? '');

  if (!normalizedQuery) {
    return options.playlists;
  }

  return options.playlists.filter((playlist) => {
    return includesQuery(playlist.name, normalizedQuery);
  });
};
