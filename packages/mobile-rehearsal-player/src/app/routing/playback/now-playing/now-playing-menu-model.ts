import type { PlayableItem } from '@org/audio-library-models';

import type { SavedItemRequest } from '../../../library/components/saved-item-menu/saved-item-requests';

const MS_PER_SECOND = 1000;

export type NowPlayingMakeLoopRequest = {
  sourceId: string;
  startMs: number;
};

/**
 * The playback sheet's `Make loop` (task 8.47): a new loop on the active
 * track, starting at the playhead. A saved loop already has its chip for
 * editing, and an unavailable source cannot be played into a loop, so only an
 * available plain track offers it.
 */
export const resolveNowPlayingMakeLoopRequest = (options: {
  activePlayableItem: PlayableItem;
  playbackPositionSeconds: number;
}): NowPlayingMakeLoopRequest | null => {
  const { activePlayableItem } = options;

  if (
    activePlayableItem.kind !== 'track' ||
    activePlayableItem.transform ||
    activePlayableItem.source.availability.status !== 'available'
  ) {
    return null;
  }

  return {
    sourceId: activePlayableItem.source.id,
    startMs: Math.max(
      0,
      Math.round(options.playbackPositionSeconds * MS_PER_SECOND),
    ),
  };
};

/**
 * The playback overflow's `Add marker here` (design Decision 4): a marker at
 * the playhead of the playing item's track. A saved loop is addressed by its
 * loop (its markers are its owning track's), anything else by its track; an
 * item that is not saved has no track to hold a marker.
 */
export const resolveNowPlayingAddMarkerRequest = (options: {
  activePlayableItem: Pick<PlayableItem, 'kind' | 'loopId' | 'sourceId'>;
  isSaved: boolean;
}): SavedItemRequest | null => {
  const { activePlayableItem } = options;

  if (!options.isSaved) {
    return null;
  }

  if (activePlayableItem.kind === 'loop' && activePlayableItem.loopId) {
    return {
      action: 'add-marker-here',
      id: activePlayableItem.loopId,
      kind: 'loop',
    };
  }

  return {
    action: 'add-marker-here',
    id: activePlayableItem.sourceId,
    kind: 'track',
  };
};
