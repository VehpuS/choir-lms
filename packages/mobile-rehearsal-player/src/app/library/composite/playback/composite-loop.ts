import {
  isCompositeSource,
  type PlayableItem,
  type RepeatMode,
} from '@org/audio-library-models';

import type { EngineLoop } from '../engine/composite-engine';
import { shouldRepeatSingleItemPlayback } from '../../playback/utils/saved-track-playback-timeline';

/**
 * The range the engine should wrap by itself (design Decision 5 and spike 1.1
 * item 8), or null when the playback effects handle the end: a loop of a
 * composite, or a whole composite, repeating on its own. In a playlist the end
 * advances the playlist, and without repeat the end stops, so neither loops.
 */
export const resolveCompositeLoop = (options: {
  item: PlayableItem | null;
  repeatMode: RepeatMode;
  isInPlaylistSession: boolean;
}): EngineLoop | null => {
  const { item } = options;

  if (
    !item ||
    !isCompositeSource(item.source) ||
    options.isInPlaylistSession ||
    !shouldRepeatSingleItemPlayback(options.repeatMode)
  ) {
    return null;
  }

  const endMs = item.range.endMs ?? item.source.durationMs ?? null;

  return endMs !== null && endMs > item.range.startMs
    ? { startMs: item.range.startMs, endMs }
    : null;
};
