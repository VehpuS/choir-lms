import type { PlayableItem } from '@org/audio-library-models';
import type { PunchLoop } from '@org/audio-mixing';
import { useEffect, useState } from 'react';

import { getSavedTrackPlayer } from '../../playback/utils/saved-track-player-interop';

const MS_PER_SECOND = 1000;

/** The loop a loop item plays, for the punch sheet's `Use active loop`. */
export const loopOf = (item: PlayableItem): PunchLoop | undefined =>
  item.kind === 'loop' && item.loopId && item.range.endMs !== null
    ? {
        endMs: item.range.endMs,
        id: item.loopId,
        name: item.title,
        startMs: item.range.startMs,
      }
    : undefined;

/** The playing track's length, read while the punch sheet is open. */
export const usePunchTrackDuration = (isOpen: boolean): number => {
  const [durationMs, setDurationMs] = useState(0);

  useEffect(() => {
    if (!isOpen) {
      return;
    }

    void Promise.resolve(getSavedTrackPlayer().getProgress())
      .then((progress) => setDurationMs(progress.duration * MS_PER_SECOND))
      .catch(() => setDurationMs(0));
  }, [isOpen]);

  return durationMs;
};
