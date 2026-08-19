import { type NamedLoop, type Playlist } from '@org/audio-library-models';

import type { DriveLibrarySource } from '../../drive/utils/drive-library-view-model';

const normalizeTagToken = (value: string) => {
  return value.trim();
};

export const resolveAvailableTagFilters = (options: {
  savedLibrarySources: DriveLibrarySource[];
  savedLoops: NamedLoop[];
  savedPlaylists: Playlist[];
}) => {
  const uniqueTagsByKey = new Map<string, string>();

  const collectTags = (tags: string[] | undefined) => {
    if (!tags) {
      return;
    }

    for (const tag of tags) {
      const normalizedTag = normalizeTagToken(tag);

      if (!normalizedTag) {
        continue;
      }

      const tagKey = normalizedTag.toLocaleLowerCase();

      if (!uniqueTagsByKey.has(tagKey)) {
        uniqueTagsByKey.set(tagKey, normalizedTag);
      }
    }
  };

  for (const source of options.savedLibrarySources) {
    collectTags(source.tags);
  }

  for (const loop of options.savedLoops) {
    collectTags(loop.tags);
  }

  for (const playlist of options.savedPlaylists) {
    collectTags(playlist.tags);
  }

  return [...uniqueTagsByKey.values()].sort((leftTag, rightTag) => {
    return leftTag.localeCompare(rightTag, undefined, {
      sensitivity: 'base',
    });
  });
};
