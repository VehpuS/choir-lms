import {
  createLoopPlayableItem,
  createTrackPlayableItem,
  isSourcePlayable,
  type DriveAudioSource,
  type NamedLoop,
  type PlayableItem,
} from '@org/audio-library-models';
import { keyBy } from 'es-toolkit/compat';

import type { PlaybackRef } from './playback-expansion';

export type PlaybackItemsResolution = {
  playableItems: PlayableItem[];
  /** Effective refs that cannot play (missing, or a source without playable audio). */
  unavailableCount: number;
};

/**
 * Turns the effective refs of a bulk playback action into playable items, in
 * the same order. A ref whose source or loop is gone, or whose source cannot
 * play (for example Drive access is missing), is counted rather than queued so
 * the confirmation can say how many were left out.
 */
export const resolvePlaybackRefsToPlayableItems = (
  refs: readonly PlaybackRef[],
  collections: { loops: NamedLoop[]; sources: DriveAudioSource[] },
): PlaybackItemsResolution => {
  const sourcesById = keyBy(collections.sources, (source) => source.id);
  const loopsById = keyBy(collections.loops, (loop) => loop.id);
  const playableItems: PlayableItem[] = [];

  for (const ref of refs) {
    const playable =
      ref.kind === 'track'
        ? createTrackItem(sourcesById[ref.entityId])
        : createLoopItem(loopsById[ref.entityId], sourcesById);

    if (playable) {
      playableItems.push(playable);
    }
  }

  return {
    playableItems,
    unavailableCount: refs.length - playableItems.length,
  };
};

const createTrackItem = (source: DriveAudioSource | undefined) => {
  return source && isSourcePlayable(source)
    ? createTrackPlayableItem(source)
    : null;
};

const createLoopItem = (
  loop: NamedLoop | undefined,
  sourcesById: Partial<Record<string, DriveAudioSource>>,
) => {
  const source = loop ? sourcesById[loop.sourceId] : undefined;

  return loop && source && isSourcePlayable(source)
    ? createLoopPlayableItem(loop, source)
    : null;
};
