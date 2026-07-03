import type { NamedLoop, Playlist } from '@org/audio-library-models';

import type { DriveLibrarySource } from '../../drive/utils/drive-library-view-model';

export type LibrarySearchEntityFilter =
  | 'all'
  | 'tracks'
  | 'loops'
  | 'playlists';

export type LibrarySearchAvailabilityFilter =
  | 'all'
  | 'available'
  | 'unavailable';

export type SearchHighlightPart = {
  isHighlighted: boolean;
  text: string;
};

export const normalizeSearchQuery = (value: string) => {
  return value.trim().toLocaleLowerCase();
};

const includesNormalizedQuery = (value: string, query: string) => {
  return value.toLocaleLowerCase().includes(query);
};

const isSourceAvailable = (source: DriveLibrarySource) => {
  return source.availability.status === 'available';
};

const matchesEntityFilter = (
  entityFilter: LibrarySearchEntityFilter,
  entityType: Exclude<LibrarySearchEntityFilter, 'all'>,
) => {
  return entityFilter === 'all' || entityFilter === entityType;
};

const matchesAvailabilityFilter = (options: {
  availabilityFilter: LibrarySearchAvailabilityFilter;
  isAvailable: boolean;
}) => {
  if (options.availabilityFilter === 'all') {
    return true;
  }

  if (options.availabilityFilter === 'available') {
    return options.isAvailable;
  }

  return !options.isAvailable;
};

export const resolveSearchHighlightParts = (options: {
  query: string | null;
  text: string;
}): SearchHighlightPart[] => {
  const normalizedQuery = normalizeSearchQuery(options.query ?? '');

  if (!normalizedQuery) {
    return [
      {
        isHighlighted: false,
        text: options.text,
      },
    ];
  }

  const normalizedText = options.text.toLocaleLowerCase();
  const parts: SearchHighlightPart[] = [];
  let currentIndex = 0;
  let matchIndex = normalizedText.indexOf(normalizedQuery);

  while (matchIndex !== -1) {
    if (matchIndex > currentIndex) {
      parts.push({
        isHighlighted: false,
        text: options.text.slice(currentIndex, matchIndex),
      });
    }

    const matchEndIndex = matchIndex + normalizedQuery.length;

    parts.push({
      isHighlighted: true,
      text: options.text.slice(matchIndex, matchEndIndex),
    });

    currentIndex = matchEndIndex;
    matchIndex = normalizedText.indexOf(normalizedQuery, currentIndex);
  }

  if (parts.length === 0) {
    return [
      {
        isHighlighted: false,
        text: options.text,
      },
    ];
  }

  if (currentIndex < options.text.length) {
    parts.push({
      isHighlighted: false,
      text: options.text.slice(currentIndex),
    });
  }

  return parts;
};

export const resolveActiveLibrarySearchQuery = (query: string) => {
  const nextQuery = query.trim();

  return nextQuery.length > 0 ? nextQuery : null;
};

export const filterSavedLibrarySourcesByQuery = (options: {
  activeSearchQuery: string | null;
  availabilityFilter: LibrarySearchAvailabilityFilter;
  entityFilter: LibrarySearchEntityFilter;
  sources: DriveLibrarySource[];
}) => {
  if (!matchesEntityFilter(options.entityFilter, 'tracks')) {
    return [];
  }

  const normalizedQuery = normalizeSearchQuery(options.activeSearchQuery ?? '');

  return options.sources.filter((source) => {
    if (
      !matchesAvailabilityFilter({
        availabilityFilter: options.availabilityFilter,
        isAvailable: isSourceAvailable(source),
      })
    ) {
      return false;
    }

    if (!normalizedQuery) {
      return true;
    }

    return includesNormalizedQuery(source.name, normalizedQuery);
  });
};

export const filterSavedLoopsByQuery = (options: {
  activeSearchQuery: string | null;
  availabilityFilter: LibrarySearchAvailabilityFilter;
  entityFilter: LibrarySearchEntityFilter;
  loops: NamedLoop[];
  sources: DriveLibrarySource[];
}) => {
  if (!matchesEntityFilter(options.entityFilter, 'loops')) {
    return [];
  }

  const normalizedQuery = normalizeSearchQuery(options.activeSearchQuery ?? '');
  const sourceAvailabilityById = new Map(
    options.sources.map((source) => {
      return [source.id, isSourceAvailable(source)] as const;
    }),
  );

  return options.loops.filter((loop) => {
    const isAvailable = sourceAvailabilityById.get(loop.sourceId) ?? false;

    if (
      !matchesAvailabilityFilter({
        availabilityFilter: options.availabilityFilter,
        isAvailable,
      })
    ) {
      return false;
    }

    if (!normalizedQuery) {
      return true;
    }

    return (
      includesNormalizedQuery(loop.name, normalizedQuery) ||
      includesNormalizedQuery(loop.sourceName, normalizedQuery)
    );
  });
};

export const filterSavedPlaylistsByQuery = (options: {
  activeSearchQuery: string | null;
  availabilityFilter: LibrarySearchAvailabilityFilter;
  entityFilter: LibrarySearchEntityFilter;
  playlists: Playlist[];
}) => {
  if (!matchesEntityFilter(options.entityFilter, 'playlists')) {
    return [];
  }

  if (options.availabilityFilter !== 'all') {
    return [];
  }

  const normalizedQuery = normalizeSearchQuery(options.activeSearchQuery ?? '');

  if (!normalizedQuery) {
    return options.playlists;
  }

  return options.playlists.filter((playlist) => {
    return includesNormalizedQuery(playlist.name, normalizedQuery);
  });
};
