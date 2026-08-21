import {
  createLoopPlayableItem,
  createTrackPlayableItem,
  isSourcePlayable,
  type DriveAudioSource,
  type NamedLoop,
  type PlayableItem,
  type RehearsalLibraryFileLinkNode,
  type RehearsalLibraryFolderNode,
} from '@org/audio-library-models';
import {
  resolveFolderPlayableItems,
  resolvePlaylistItems,
  type RehearsalLibraryTagMatch,
} from '@org/audio-library-runtime';
import { flatMap, keyBy } from 'es-toolkit/compat';

import { dedupePlayableItems } from '../../playlists/utils/playlist-playback-queue-state';

export const resolveTagQueuePlayableItems = (
  matches: RehearsalLibraryTagMatch[],
  options: {
    fileLinks: RehearsalLibraryFileLinkNode[];
    folders: RehearsalLibraryFolderNode[];
    loops: NamedLoop[];
    sources: DriveAudioSource[];
  },
): PlayableItem[] => {
  const sourcesById: Partial<Record<string, DriveAudioSource>> = keyBy(
    options.sources,
    (source) => source.id,
  );

  const items = flatMap(matches, (match) => {
    if (match.kind === 'track') {
      return isSourcePlayable(match.item)
        ? [createTrackPlayableItem(match.item)]
        : [];
    }

    if (match.kind === 'loop') {
      const source = sourcesById[match.item.sourceId];

      return source && isSourcePlayable(source)
        ? [createLoopPlayableItem(match.item, source)]
        : [];
    }

    if (match.kind === 'playlist') {
      return resolvePlaylistItems(match.item, options.loops, options.sources);
    }

    return resolveFolderPlayableItems(
      match.item,
      options.folders,
      options.fileLinks,
      options.loops,
      options.sources,
    );
  });

  return dedupePlayableItems(items);
};
