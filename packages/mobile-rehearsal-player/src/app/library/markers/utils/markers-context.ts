import {
  createLoopPlayableItem,
  createTrackPlayableItem,
  type MarkerRange,
  type NamedLoop,
  type PlayableItem,
} from '@org/audio-library-models';

import type { DriveLibrarySource } from '../../drive/utils/drive-library-view-model';
import type { MarkersItem } from '../hooks/use-source-markers';

export type MarkersRequest = { id: string; kind: 'loop' | 'track' };

/** Everything the markers list needs to know about the item it opened from. */
export type MarkersContext = {
  /** Resolves the owning track's markers (a track, adjusted track, or loop). */
  item: MarkersItem;
  /** The item a jump plays when nothing relevant is loaded. */
  target: PlayableItem;
  /** Loop context: only markers inside the loop are listed. */
  range?: MarkerRange;
  loop?: NamedLoop;
};

/**
 * Builds the context for a `Markers` request from a track's source id or a
 * loop id. Returns null when the item no longer exists (a loop whose track was
 * removed has no markers to show).
 */
export const resolveMarkersContext = (
  request: MarkersRequest,
  savedSources: readonly DriveLibrarySource[],
  savedLoops: readonly NamedLoop[],
): MarkersContext | null => {
  if (request.kind === 'loop') {
    const loop = savedLoops.find(({ id }) => id === request.id);
    const source = loop
      ? savedSources.find(({ id }) => id === loop.sourceId)
      : undefined;

    if (!loop || !source) {
      return null;
    }

    return {
      item: { id: loop.id, sourceId: loop.sourceId },
      loop,
      range: { startMs: loop.startMs, endMs: loop.endMs },
      target: createLoopPlayableItem(loop, source),
    };
  }

  const source = savedSources.find(({ id }) => id === request.id);

  return source
    ? { item: source, target: createTrackPlayableItem(source) }
    : null;
};
