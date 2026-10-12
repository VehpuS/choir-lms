import type { PlayableItem } from '@org/audio-library-models';

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
