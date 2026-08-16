import {
  normalizeLibraryEntityTags,
  type RehearsalLibraryFolderNode,
} from '@org/audio-library-models';

import type { RehearsalLibraryEntityCollections } from './rehearsal-library-files';

export type RehearsalLibraryTagUsage = {
  tag: string;
  count: number;
};

const collectEntityTagLists = (options: {
  entityCollections: RehearsalLibraryEntityCollections;
  folders: RehearsalLibraryFolderNode[];
}): string[][] => {
  return [
    ...options.entityCollections.sources.map((source) => source.tags ?? []),
    ...options.entityCollections.loops.map((loop) => loop.tags ?? []),
    ...options.entityCollections.playlists.map(
      (playlist) => playlist.tags ?? [],
    ),
    ...options.folders.map((folder) => folder.tags ?? []),
  ];
};

export const aggregateRehearsalLibraryTags = (options: {
  entityCollections: RehearsalLibraryEntityCollections;
  folders: RehearsalLibraryFolderNode[];
}): RehearsalLibraryTagUsage[] => {
  const usageByTagKey = new Map<string, RehearsalLibraryTagUsage>();

  for (const entityTags of collectEntityTagLists(options)) {
    for (const tag of normalizeLibraryEntityTags(entityTags)) {
      const tagKey = tag.toLocaleLowerCase();
      const existingUsage = usageByTagKey.get(tagKey);

      if (existingUsage) {
        existingUsage.count += 1;
        continue;
      }

      usageByTagKey.set(tagKey, { tag, count: 1 });
    }
  }

  return [...usageByTagKey.values()].sort((a, b) => {
    if (a.count !== b.count) {
      return b.count - a.count;
    }

    return a.tag.localeCompare(b.tag, undefined, { sensitivity: 'base' });
  });
};
