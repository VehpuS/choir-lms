// The page's audio session, where the browser has one (iOS Safari 16.4 and
// later; the Audio Session API, `navigator.audioSession`). Without asking, Web
// Audio on its own follows the silent switch and is muted by it, and the page
// only gets to be audible once some media element has played: which is why the
// piano could be silent on a fresh launch yet sound once a track had played.
// Asking for the `playback` type makes it audible like a media player.
// The app's TypeScript config has no DOM lib, so the slice used is structural.
type AudioSessionLike = { type: string };

export type AudioSessionLease = {
  /** Asks for the playback session; harmless to repeat. */
  request: () => void;
  /** Gives the session type back to what it was before `request`. */
  release: () => void;
};

const PLAYBACK = 'playback';

/**
 * Holds the page's audio session at `playback` between `request` and
 * `release`, and puts the previous type back after, so the rest of the app is
 * not left claiming the speaker (it would interrupt other apps' audio).
 * Where there is no audio session, both do nothing.
 */
export const createPlaybackAudioSessionLease = (
  getSession: () => AudioSessionLike | undefined,
): AudioSessionLease => {
  let previousType: string | null = null;

  return {
    request: () => {
      const session = getSession();

      if (!session || previousType !== null) {
        return;
      }

      previousType = session.type;

      try {
        session.type = PLAYBACK;
      } catch {
        // A browser that refuses the type; the piano plays as it did.
        previousType = null;
      }
    },
    release: () => {
      const session = getSession();

      if (!session || previousType === null) {
        return;
      }

      const type = previousType;

      previousType = null;

      try {
        session.type = type;
      } catch {
        // As above.
      }
    },
  };
};
