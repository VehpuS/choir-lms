import type { PlayableItem } from '@org/audio-library-models';

import type { CompositeEngine } from '../engine/composite-engine';
import { setActiveCompositeEngine } from './active-composite';

const MS_PER_SECOND = 1000;

/** The slice of the wrapped player a composite load uses. */
export type CompositeLoadPlayer = {
  reset: () => Promise<unknown>;
};

export type LoadCompositeItemOptions = {
  item: PlayableItem;
  player: CompositeLoadPlayer;
  loadEngine: (item: PlayableItem) => Promise<CompositeEngine>;
  volume: number;
  initialPositionSeconds: number;
  shouldPlay: boolean;
  /** Applies the session speed and pitch to the new engine, before it plays. */
  applyShaping?: () => Promise<void>;
};

/**
 * The composite branch of `loadIntoPlayer` (design Decision 5). The player is
 * reset first, so the previous track releases its media element and blob URLs
 * (and a previous composite is cleared); the engine then becomes the active
 * player. A load that fails leaves nothing active.
 */
export const loadCompositeItemIntoPlayer = async (
  options: LoadCompositeItemOptions,
): Promise<PlayableItem> => {
  await options.player.reset();

  const engine = await options.loadEngine(options.item);

  setActiveCompositeEngine(engine);
  engine.setVolume(options.volume);
  await options.applyShaping?.();

  if (options.initialPositionSeconds > 0) {
    engine.seek(options.initialPositionSeconds * MS_PER_SECOND);
  }

  if (options.shouldPlay) {
    engine.play();
  }

  return options.item;
};
