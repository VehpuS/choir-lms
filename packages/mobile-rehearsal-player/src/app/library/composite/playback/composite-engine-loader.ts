import type { PlayableItem } from '@org/audio-library-models';

import { COMPOSITE_UNAVAILABLE_MESSAGE } from '../composite-capabilities';
import type { CompositeEngine } from '../engine/composite-engine';

/**
 * How a composite item becomes an engine: resolve its stems, load and prepare
 * them, and build the audio graph. The app registers the real one where
 * composites can play (task 4.5); until then, and on native, loading a
 * composite fails with the unavailable message instead of reaching the media
 * element.
 */
export type CompositeEngineLoader = (
  item: PlayableItem,
  options: { signal?: AbortSignal },
) => Promise<CompositeEngine>;

let registeredLoader: CompositeEngineLoader | null = null;

export const setCompositeEngineLoader = (
  loader: CompositeEngineLoader | null,
) => {
  registeredLoader = loader;
};

export const loadCompositeEngine: CompositeEngineLoader = async (
  item,
  options,
) => {
  if (!registeredLoader) {
    throw new Error(COMPOSITE_UNAVAILABLE_MESSAGE);
  }

  return registeredLoader(item, options);
};
