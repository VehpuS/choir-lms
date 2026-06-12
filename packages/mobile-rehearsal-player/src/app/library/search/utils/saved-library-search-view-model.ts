import type { NamedLoop, Playlist } from '@org/audio-library-models';

import type { DriveLibrarySource } from '../../drive/utils/drive-library-view-model';

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
  sources: DriveLibrarySource[];
}) => {
  const normalizedQuery = normalizeSearchQuery(options.activeSearchQuery ?? '');

  if (!normalizedQuery) {
    return options.sources;
  }

  return options.sources.filter((source) => {
    return includesNormalizedQuery(source.name, normalizedQuery);
  });
};

export const filterSavedLoopsByQuery = (options: {
  activeSearchQuery: string | null;
  loops: NamedLoop[];
}) => {
  const normalizedQuery = normalizeSearchQuery(options.activeSearchQuery ?? '');

  if (!normalizedQuery) {
    return options.loops;
  }

  return options.loops.filter((loop) => {
    return (
      includesNormalizedQuery(loop.name, normalizedQuery) ||
      includesNormalizedQuery(loop.sourceName, normalizedQuery)
    );
  });
};

export const filterSavedPlaylistsByQuery = (options: {
  activeSearchQuery: string | null;
  playlists: Playlist[];
}) => {
  const normalizedQuery = normalizeSearchQuery(options.activeSearchQuery ?? '');

  if (!normalizedQuery) {
    return options.playlists;
  }

  return options.playlists.filter((playlist) => {
    return includesNormalizedQuery(playlist.name, normalizedQuery);
  });
};
