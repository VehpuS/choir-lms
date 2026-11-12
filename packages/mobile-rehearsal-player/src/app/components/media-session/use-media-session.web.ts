import { useEffect, useRef } from 'react';

import {
  shouldReportPosition,
  toMediaMetadata,
  toPlaybackState,
  toPositionState,
  type MediaSessionSnapshot,
} from './model';
import type { MediaSessionCommand } from './use-media-session';

// The app's TypeScript config carries no DOM library, so the slice of the Media
// Session API used here is described structurally.
type MediaSessionLike = {
  metadata: unknown;
  playbackState: string;
  setActionHandler(action: string, handler: (() => void) | null): void;
  setPositionState(state?: {
    duration: number;
    playbackRate: number;
    position: number;
  }): void;
};
type BrowserScope = {
  MediaMetadata?: new (init: unknown) => unknown;
  navigator?: { mediaSession?: MediaSessionLike };
};

const ACTIONS: readonly [string, MediaSessionCommand][] = [
  ['play', 'play'],
  ['pause', 'pause'],
  ['nexttrack', 'next'],
  ['previoustrack', 'previous'],
];

const MS_PER_SECOND = 1000;

const getMediaSession = () =>
  (globalThis as unknown as BrowserScope).navigator?.mediaSession;

/**
 * Tells the browser what is playing so the lock screen, the notification
 * shade, headphone buttons and the keyboard's media keys show it and can play,
 * pause and skip. `react-native-track-player`'s web runtime does none of this.
 */
export const useMediaSession = ({
  onCommand,
  snapshot,
}: {
  onCommand: (command: MediaSessionCommand) => void;
  snapshot: MediaSessionSnapshot;
}) => {
  const latestOnCommand = useRef(onCommand);
  const lastReport = useRef<{
    atMs: number;
    key: string;
    seconds: number;
  } | null>(null);

  latestOnCommand.current = onCommand;

  // The remote buttons, for as long as the player is mounted.
  useEffect(() => {
    const session = getMediaSession();

    if (!session) {
      return undefined;
    }

    for (const [action, command] of ACTIONS) {
      try {
        session.setActionHandler(action, () => {
          latestOnCommand.current(command);
        });
      } catch {
        // A browser that does not know this action; the others still work.
      }
    }

    return () => {
      for (const [action] of ACTIONS) {
        try {
          session.setActionHandler(action, null);
        } catch {
          // As above.
        }
      }
    };
  }, []);

  const { title } = snapshot;

  useEffect(() => {
    const session = getMediaSession();
    const { MediaMetadata } = globalThis as unknown as BrowserScope;

    if (!session || !MediaMetadata) {
      return;
    }

    session.metadata = title ? new MediaMetadata(toMediaMetadata(title)) : null;
  }, [title]);

  const playbackState = toPlaybackState(snapshot);

  useEffect(() => {
    const session = getMediaSession();

    if (session) {
      session.playbackState = playbackState;
    }
  }, [playbackState]);

  const { durationSeconds, isPlaying, playbackRate, positionSeconds } =
    snapshot;

  useEffect(() => {
    const session = getMediaSession();

    if (!session) {
      return;
    }

    if (!snapshot.hasItem) {
      lastReport.current = null;
      session.setPositionState();

      return;
    }

    // A new item, speed, length or play state always reports; otherwise only a
    // jump does, since the browser advances the scrubber by itself.
    const key = `${title}|${durationSeconds}|${playbackRate}|${isPlaying}`;
    const last = lastReport.current;
    const isSameState = last?.key === key;
    const elapsedSeconds = last ? (Date.now() - last.atMs) / MS_PER_SECOND : 0;

    if (
      isSameState &&
      !shouldReportPosition({
        actualSeconds: positionSeconds,
        elapsedSecondsSinceReport: elapsedSeconds,
        isPlaying,
        playbackRate,
        reportedSeconds: last?.seconds ?? null,
      })
    ) {
      return;
    }

    const state = toPositionState({
      durationSeconds,
      playbackRate,
      positionSeconds,
    });

    if (!state) {
      return;
    }

    try {
      session.setPositionState(state);
      lastReport.current = {
        atMs: Date.now(),
        key,
        seconds: state.position,
      };
    } catch {
      // The browser refused these values; the next change tries again.
    }
  }, [
    durationSeconds,
    isPlaying,
    playbackRate,
    positionSeconds,
    snapshot.hasItem,
    title,
  ]);
};
