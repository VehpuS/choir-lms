import { useSyncExternalStore } from 'react';

import { isDeviceOffline } from '../../offline/device-connection';
import { ListeningNoRoomError } from './create-listening-engine-loader';

/**
 * A track that could not be put on the engine while a microphone is open
 * (clear-playback-while-listening design Decision 3): it plays on the media
 * element, and the app says once why and that it may sound thin on Bluetooth.
 * The track is remembered until something else loads or the microphone
 * closes, so the hand-over does not keep trying it.
 */

export type ListeningFallbackReason = 'no-room' | 'offline' | 'failed';

export type ListeningFallback = {
  trackId: string;
  reason: ListeningFallbackReason;
  /** The message is shown for a while, then the usual line returns. */
  isNoticeVisible: boolean;
};

/** Long enough to read on the mini-player; the fallback itself lasts longer. */
export const LISTENING_FALLBACK_NOTICE_MS = 10_000;

export const classifyListeningFallback = (
  error: unknown,
  isOffline: boolean,
): ListeningFallbackReason => {
  if (error instanceof ListeningNoRoomError) {
    return 'no-room';
  }

  return isOffline ? 'offline' : 'failed';
};

const THIN = 'May sound thin on Bluetooth';
const REASONS: Record<ListeningFallbackReason, string> = {
  'no-room': 'no room to prepare this track',
  offline: 'offline, track not prepared',
  failed: 'track could not be prepared',
};

/** The line for the track that is playing; null when there is nothing to say (any more). */
export const getListeningFallbackLabel = (
  fallback: ListeningFallback | null,
  activeTrackId: string | null,
): string | null =>
  fallback && fallback.isNoticeVisible && fallback.trackId === activeTrackId
    ? `${THIN} · ${REASONS[fallback.reason]}`
    : null;

type Timers = {
  setTimer: (callback: () => void, ms: number) => unknown;
  clearTimer: (handle: unknown) => void;
};

const browserTimers: Timers = {
  setTimer: (callback, ms) => setTimeout(callback, ms),
  clearTimer: (handle) => clearTimeout(handle as ReturnType<typeof setTimeout>),
};

export const createListeningFallbackStore = (
  timers: Timers = browserTimers,
  isOffline: () => boolean = isDeviceOffline,
) => {
  let current: ListeningFallback | null = null;
  let noticeTimer: unknown = null;
  const listeners = new Set<() => void>();

  const publish = (next: ListeningFallback | null) => {
    current = next;
    listeners.forEach((listener) => listener());
  };

  const stopTimer = () => {
    if (noticeTimer !== null) {
      timers.clearTimer(noticeTimer);
      noticeTimer = null;
    }
  };

  return {
    /** The track stays on the media element because of `error`. */
    report: (trackId: string, error: unknown) => {
      stopTimer();
      publish({
        trackId,
        reason: classifyListeningFallback(error, isOffline()),
        isNoticeVisible: true,
      });
      noticeTimer = timers.setTimer(() => {
        noticeTimer = null;

        if (current) {
          publish({ ...current, isNoticeVisible: false });
        }
      }, LISTENING_FALLBACK_NOTICE_MS);
    },
    /** Another load, or no microphone any more: nothing is remembered. */
    clear: () => {
      stopTimer();

      if (current) {
        publish(null);
      }
    },
    has: (trackId: string): boolean => current?.trackId === trackId,
    get: (): ListeningFallback | null => current,
    subscribe: (listener: () => void) => {
      listeners.add(listener);

      return () => {
        listeners.delete(listener);
      };
    },
  };
};

const store = createListeningFallbackStore();

export const getListeningFallbackStore = () => store;

export const useListeningFallback = (): ListeningFallback | null =>
  useSyncExternalStore(store.subscribe, store.get, store.get);
