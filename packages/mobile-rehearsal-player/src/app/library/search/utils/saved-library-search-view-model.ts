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

const normalizeTagToken = (value: string) => {
  return value.trim().toLocaleLowerCase();
};

export const normalizeSelectedTags = (tags: string[]) => {
  const uniqueTags: string[] = [];
  const seenTags = new Set<string>();

  for (const tag of tags) {
    const normalizedTag = normalizeTagToken(tag);

    if (!normalizedTag || seenTags.has(normalizedTag)) {
      continue;
    }

    seenTags.add(normalizedTag);
    uniqueTags.push(normalizedTag);
  }

  return uniqueTags;
};

export const matchesSelectedTags = (options: {
  selectedTags: string[];
  tags: string[] | undefined;
}) => {
  if (options.selectedTags.length === 0) {
    return true;
  }

  if (!options.tags || options.tags.length === 0) {
    return false;
  }

  const entityTags = new Set(
    options.tags.map((tag) => {
      return normalizeTagToken(tag);
    }),
  );

  return options.selectedTags.every((tag) => {
    return entityTags.has(tag);
  });
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

export const matchesEntityFilter = (
  entityFilter: LibrarySearchEntityFilter,
  entityType: Exclude<LibrarySearchEntityFilter, 'all'>,
) => {
  return entityFilter === 'all' || entityFilter === entityType;
};

export const matchesAvailabilityFilter = (options: {
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
  selectedTagFilters?: string[];
  sources: DriveLibrarySource[];
}) => {
  if (!matchesEntityFilter(options.entityFilter, 'tracks')) {
    return [];
  }

  const normalizedQuery = normalizeSearchQuery(options.activeSearchQuery ?? '');
  const selectedTags = normalizeSelectedTags(options.selectedTagFilters ?? []);

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
      return matchesSelectedTags({
        selectedTags,
        tags: source.tags,
      });
    }

    if (!includesNormalizedQuery(source.name, normalizedQuery)) {
      return false;
    }

    return matchesSelectedTags({
      selectedTags,
      tags: source.tags,
    });
  });
};

export const filterSavedLoopsByQuery = (options: {
  activeSearchQuery: string | null;
  availabilityFilter: LibrarySearchAvailabilityFilter;
  entityFilter: LibrarySearchEntityFilter;
  loops: NamedLoop[];
  selectedTagFilters?: string[];
  sources: DriveLibrarySource[];
}) => {
  if (!matchesEntityFilter(options.entityFilter, 'loops')) {
    return [];
  }

  const normalizedQuery = normalizeSearchQuery(options.activeSearchQuery ?? '');
  const selectedTags = normalizeSelectedTags(options.selectedTagFilters ?? []);
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
      return matchesSelectedTags({
        selectedTags,
        tags: loop.tags,
      });
    }

    if (
      !includesNormalizedQuery(loop.name, normalizedQuery) &&
      !includesNormalizedQuery(loop.sourceName, normalizedQuery)
    ) {
      return false;
    }

    return matchesSelectedTags({
      selectedTags,
      tags: loop.tags,
    });
  });
};

export const filterSavedPlaylistsByQuery = (options: {
  activeSearchQuery: string | null;
  availabilityFilter: LibrarySearchAvailabilityFilter;
  entityFilter: LibrarySearchEntityFilter;
  playlists: Playlist[];
  selectedTagFilters?: string[];
}) => {
  if (!matchesEntityFilter(options.entityFilter, 'playlists')) {
    return [];
  }

  if (options.availabilityFilter !== 'all') {
    return [];
  }

  const normalizedQuery = normalizeSearchQuery(options.activeSearchQuery ?? '');
  const selectedTags = normalizeSelectedTags(options.selectedTagFilters ?? []);

  return options.playlists.filter((playlist) => {
    if (
      normalizedQuery &&
      !includesNormalizedQuery(playlist.name, normalizedQuery)
    ) {
      return false;
    }

    return matchesSelectedTags({
      selectedTags,
      tags: playlist.tags,
    });
  });
};
