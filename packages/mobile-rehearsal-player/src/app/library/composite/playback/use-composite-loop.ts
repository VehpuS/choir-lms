import { useEffect } from 'react';

import type { PlayableItem, RepeatMode } from '@org/audio-library-models';

import { resolveCompositeLoop } from './composite-loop';
import { useActiveCompositeEngine } from './use-active-composite';

/**
 * Keeps the active composite engine looping the range of the active item while
 * it repeats. The engine is not active until its load finishes, so this runs
 * again when it becomes active, and clears the loop when repeat is turned off.
 */
export const useCompositeLoopSync = (options: {
  item: PlayableItem | null;
  repeatMode: RepeatMode;
  isInPlaylistSession: boolean;
}) => {
  const engine = useActiveCompositeEngine();
  const { isInPlaylistSession, item, repeatMode } = options;

  useEffect(() => {
    engine?.setLoop(
      resolveCompositeLoop({ isInPlaylistSession, item, repeatMode }),
    );
  }, [engine, isInPlaylistSession, item, repeatMode]);
};
