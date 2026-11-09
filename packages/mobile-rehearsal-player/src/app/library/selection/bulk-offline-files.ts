import type {
  CompositeTrack,
  DriveAudioSource,
  PlayableItem,
} from '@org/audio-library-models';

import { resolveCompositeOfflineSources } from '../composite/list/composite-offline';

/**
 * The Drive files a bulk keep or remove acts on: a track or loop is its
 * source's file, a composite is the files of its stems (composite-tracks 7.5),
 * the same set its own `Keep all stems offline` row uses. Callers de-duplicate
 * by file afterwards, so a track that is also a stem counts once.
 */
export const resolveBulkOfflineFiles = (
  playableItems: readonly PlayableItem[],
  collections: {
    composites?: readonly CompositeTrack[];
    sources: readonly DriveAudioSource[];
  },
): DriveAudioSource[] =>
  playableItems.flatMap((item) => {
    if (item.kind !== 'composite') {
      return [item.source];
    }

    const composite = collections.composites?.find(
      ({ id }) => id === item.sourceId,
    );

    return composite
      ? resolveCompositeOfflineSources(composite, collections.sources)
      : [];
  });
