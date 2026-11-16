import type { DriveAudioSource, PlayableItem } from '@org/audio-library-models';

import {
  resolvePlaylistPlaybackAdvance,
  type PlaylistPlaybackSession,
} from '../../playlists/utils/saved-playlist-playback-view-model';
import type { ListeningAudio } from './create-listening-engine-loader';
import { shouldPlayOnListeningEngine } from './load-listening-item';

/**
 * While a queue plays with a microphone open, the next track is prepared
 * during the current one, so it starts without a preparing wait (clear-
 * playback-while-listening design Decision 4). One track at a time: decoding
 * is heavy on a phone, and the next track is the only one known to be needed.
 */

/** The track to prepare ahead: the next in the queue, when the rule would put it on the engine. */
export const resolveTrackToPrepareAhead = (options: {
  activeItem: PlayableItem | null;
  session: PlaylistPlaybackSession | null;
  ruleState: Parameters<typeof shouldPlayOnListeningEngine>[1];
}): DriveAudioSource | null => {
  const { activeItem, session } = options;

  if (!activeItem || !session) {
    return null;
  }

  const next = resolvePlaylistPlaybackAdvance(session).nextPlayableItem;

  // The same track again (a loop of it, or a queue of one) is prepared already.
  return next &&
    next.source.id !== activeItem.source.id &&
    shouldPlayOnListeningEngine(next, options.ruleState)
    ? next.source
    : null;
};

export type PrepareAheadRequest = {
  /** The track that is playing; its prepared audio is never removed to make room. */
  activeTrackId: string | null;
  /** The track to prepare, or null when there is nothing to prepare ahead. */
  next: DriveAudioSource | null;
  accessToken: string | null;
};

export type PrepareAhead = {
  /** Brings the work in line with the request; safe to call on every change. */
  sync: (request: PrepareAheadRequest) => void;
};

export const createPrepareAhead = (
  prepare: ListeningAudio['prepare'],
): PrepareAhead => {
  let current: { trackId: string; controller: AbortController } | null = null;
  let latest: PrepareAheadRequest | null = null;

  const start = (request: PrepareAheadRequest, next: DriveAudioSource) => {
    const controller = new AbortController();
    const work = { trackId: next.id, controller };

    current = work;
    void prepare(next, {
      accessToken: request.accessToken,
      signal: controller.signal,
      keepTrackIds: request.activeTrackId ? [request.activeTrackId] : [],
    })
      // Preparing ahead is a convenience: a failure shows when the track plays.
      .catch(() => undefined)
      .finally(() => {
        if (current === work) {
          current = null;

          // What was asked for while this ran, if it is something else.
          if (latest && latest.next?.id !== work.trackId) {
            sync(latest);
          }
        }
      });
  };

  const sync = (request: PrepareAheadRequest) => {
    latest = request;

    if (current) {
      const isStillWanted =
        current.trackId === request.next?.id ||
        // Its turn came before it was ready: the load is waiting for it.
        current.trackId === request.activeTrackId;

      if (isStillWanted) {
        return;
      }

      // The queue changed: this track is no longer next.
      current.controller.abort();
      current = null;
    }

    if (request.next) {
      start(request, request.next);
    }
  };

  return { sync };
};
