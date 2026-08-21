import {
  normalizeLibraryEntityTags,
  type RehearsalLibraryFolderNode,
} from '@org/audio-library-models';

import type { RehearsalLibraryEntityCollections } from './rehearsal-library-files';

export type RehearsalLibraryTagUsage = {
  tag: string;
  count: number;
  createdAt: string;
};

type EntityTagInfo = {
  tags: string[];
  tagAddedAt?: Record<string, string>;
};

const collectEntityTagInfos = (options: {
  entityCollections: RehearsalLibraryEntityCollections;
  folders: RehearsalLibraryFolderNode[];
}): EntityTagInfo[] => {
  return [
    ...options.entityCollections.sources.map((source) => ({
      tags: source.tags ?? [],
      tagAddedAt: source.tagAddedAt,
    })),
    ...options.entityCollections.loops.map((loop) => ({
      tags: loop.tags ?? [],
      tagAddedAt: loop.tagAddedAt,
    })),
    ...options.entityCollections.playlists.map((playlist) => ({
      tags: playlist.tags ?? [],
      tagAddedAt: playlist.tagAddedAt,
    })),
    ...options.folders.map((folder) => ({
      tags: folder.tags ?? [],
      tagAddedAt: folder.tagAddedAt,
    })),
  ];
};

export type RehearsalLibraryTagMatch =
  | { kind: 'track'; item: RehearsalLibraryEntityCollections['sources'][number] }
  | { kind: 'loop'; item: RehearsalLibraryEntityCollections['loops'][number] }
  | {
      kind: 'playlist';
      item: RehearsalLibraryEntityCollections['playlists'][number];
    }
  | { kind: 'folder'; item: RehearsalLibraryFolderNode };

const entityCarriesTag = (
  tags: string[] | undefined,
  normalizedTagKey: string,
): boolean => {
  return normalizeLibraryEntityTags(tags ?? []).some((candidateTag) => {
    return candidateTag.toLocaleLowerCase() === normalizedTagKey;
  });
};

export const resolveRehearsalLibraryTagMatches = (
  tag: string,
  options: {
    entityCollections: RehearsalLibraryEntityCollections;
    folders: RehearsalLibraryFolderNode[];
  },
): RehearsalLibraryTagMatch[] => {
  const normalizedTagKey = tag.trim().toLocaleLowerCase();

  const trackMatches: RehearsalLibraryTagMatch[] =
    options.entityCollections.sources
      .filter((source) => entityCarriesTag(source.tags, normalizedTagKey))
      .map((item) => ({ kind: 'track', item }));
  const loopMatches: RehearsalLibraryTagMatch[] =
    options.entityCollections.loops
      .filter((loop) => entityCarriesTag(loop.tags, normalizedTagKey))
      .map((item) => ({ kind: 'loop', item }));
  const playlistMatches: RehearsalLibraryTagMatch[] =
    options.entityCollections.playlists
      .filter((playlist) => entityCarriesTag(playlist.tags, normalizedTagKey))
      .map((item) => ({ kind: 'playlist', item }));
  const folderMatches: RehearsalLibraryTagMatch[] = options.folders
    .filter((folder) => entityCarriesTag(folder.tags, normalizedTagKey))
    .map((item) => ({ kind: 'folder', item }));

  return [...trackMatches, ...loopMatches, ...playlistMatches, ...folderMatches];
};

export const aggregateRehearsalLibraryTags = (options: {
  entityCollections: RehearsalLibraryEntityCollections;
  folders: RehearsalLibraryFolderNode[];
}): RehearsalLibraryTagUsage[] => {
  const usageByTagKey = new Map<string, RehearsalLibraryTagUsage>();

  for (const entityTagInfo of collectEntityTagInfos(options)) {
    for (const tag of normalizeLibraryEntityTags(entityTagInfo.tags)) {
      const tagKey = tag.toLocaleLowerCase();
      const addedAt =
        entityTagInfo.tagAddedAt?.[tag] ?? new Date().toISOString();
      const existingUsage = usageByTagKey.get(tagKey);

      if (existingUsage) {
        existingUsage.count += 1;
        existingUsage.createdAt =
          addedAt < existingUsage.createdAt
            ? addedAt
            : existingUsage.createdAt;
        continue;
      }

      usageByTagKey.set(tagKey, { tag, count: 1, createdAt: addedAt });
    }
  }

  return [...usageByTagKey.values()].sort((a, b) => {
    if (a.count !== b.count) {
      return b.count - a.count;
    }

    return a.tag.localeCompare(b.tag, undefined, { sensitivity: 'base' });
  });
};
