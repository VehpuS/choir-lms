import type { DriveAudioSource } from '@org/audio-library-models';

import type { CompositeEngine } from '../../composite/engine/composite-engine';
import { createAbortError } from '../utils/saved-track-blob-download';
import {
  getListeningAudio,
  type ListeningEngineLoader,
} from './create-listening-engine-loader';

/**
 * One single-track engine load at a time. Preparing a track can take seconds,
 * and the person may start something else meanwhile: every new load of any
 * kind supersedes the one in flight, which then ends with the shared abort
 * error and never becomes the player.
 */
export type ListeningTrackLoads = {
  /** Cancels the load in flight, if any. Called at the start of every load. */
  supersede: () => void;
  load: (
    track: DriveAudioSource,
    options: { accessToken: string | null },
  ) => Promise<CompositeEngine>;
};

export const createListeningTrackLoads = (
  loadEngine: ListeningEngineLoader,
): ListeningTrackLoads => {
  let current: AbortController | null = null;

  const supersede = () => {
    current?.abort();
    current = null;
  };

  return {
    supersede,
    load: async (track, options) => {
      supersede();

      const controller = new AbortController();

      current = controller;

      const engine = await loadEngine(track, {
        accessToken: options.accessToken,
        signal: controller.signal,
      });

      // Superseded after the last point the loader checks: the engine was
      // built but must not play.
      if (controller.signal.aborted) {
        engine.dispose();
        throw createAbortError();
      }

      return engine;
    },
  };
};

let appLoads: ListeningTrackLoads | null = null;

export const getListeningTrackLoads = (): ListeningTrackLoads => {
  appLoads ??= createListeningTrackLoads(getListeningAudio().loadEngine);

  return appLoads;
};
