import type {
  CompositeMix,
  CompositeStem,
  CompositeTrack,
} from '@org/audio-library-models';
import { resolveStemGains } from '@org/audio-mixing';

import type { CompositeEngine } from '../engine/composite-engine';
import type { EngineStem } from '../engine/composite-engine-types';
import {
  isStorageFullError,
  NO_ROOM_MESSAGE,
  NO_ROOM_SUGGESTIONS,
} from '../prepared/composite-room';
import {
  loadCompositeStems,
  type LoadStem,
  type StemLoadFailure,
  type StemLoadProgress,
} from './composite-stem-loader';

export const NO_STEMS_LOADED_MESSAGE =
  'None of this composite’s stems could be loaded.';

/** What playback shows when preparing the stems ran out of room on the device. */
export const NO_ROOM_TO_PREPARE_MESSAGE = `${NO_ROOM_MESSAGE} ${NO_ROOM_SUGGESTIONS.join(' ')}`;

export type LoadCompositeEngineOptions = {
  composite: Pick<CompositeTrack, 'stems' | 'defaultMix'>;
  loadStem: LoadStem;
  /** Builds the audio graph for the stems that loaded (the browser factory). */
  createEngine: (options: {
    stems: EngineStem[];
    initialGains: Record<string, number>;
  }) => Promise<CompositeEngine>;
  /** The mix the engine starts with; the composite's default mix when absent. */
  initialMix?: CompositeMix;
  signal?: AbortSignal;
  onProgress?: (snapshot: readonly StemLoadProgress[]) => void;
  /** The stems that could not load, flagged `Stem missing`; the rest play. */
  onStemsFailed?: (failed: readonly StemLoadFailure[]) => void;
};

const toEngineStem = (
  stem: CompositeStem,
  reader: EngineStem['reader'],
): EngineStem => ({ id: stem.id, offsetMs: stem.offsetMs, reader });

/**
 * Loads every stem of a composite and builds its engine (design Decision 10):
 * playback waits for all of them, a stem that cannot load is skipped and
 * reported, and a composite with none left does not load.
 */
export const loadCompositeEngineFromStems = async (
  options: LoadCompositeEngineOptions,
): Promise<CompositeEngine> => {
  const { composite } = options;
  const { readers, failed } = await loadCompositeStems({
    stemIds: composite.stems.map((stem) => stem.id),
    loadStem: options.loadStem,
    onProgress: options.onProgress,
    signal: options.signal,
  });

  // A full device is not a missing stem: the composite would play without
  // stems the user cannot get back until they free room, so the load fails and
  // says why (design 4.3).
  if (failed.some((failure) => isStorageFullError(failure.error))) {
    throw new Error(NO_ROOM_TO_PREPARE_MESSAGE);
  }

  if (failed.length > 0) {
    options.onStemsFailed?.(failed);
  }

  // In the composite's own stem order, whatever order the loads finished in.
  const stems = composite.stems.flatMap((stem) => {
    const reader = readers.get(stem.id);

    return reader ? [toEngineStem(stem, reader)] : [];
  });

  if (stems.length === 0) {
    throw new Error(NO_STEMS_LOADED_MESSAGE);
  }

  return options.createEngine({
    stems,
    initialGains: resolveStemGains(
      stems,
      options.initialMix ?? composite.defaultMix,
    ),
  });
};
