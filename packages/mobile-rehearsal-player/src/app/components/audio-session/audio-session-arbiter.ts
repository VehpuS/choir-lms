// The page's audio session, where the browser has one (iOS Safari 16.4 and
// later; the Audio Session API, `navigator.audioSession`). iOS has a type for
// each need, and the app wants two of them:
//  - `playback`: output only, and the one that keeps Web Audio audible with the
//    silent switch on. The piano asks for it while it is open and nothing is
//    capturing; without it the piano can be silent until a media element plays.
//  - `play-and-record`: the type for playing and capturing at once. The
//    microphone (pitch detection, recording) asks for it while it is open, so
//    the piano and the tracks stay audible while it listens, and recording over
//    a playing track works. `playback` has no input: a page that keeps it gets
//    "No microphone found".
// Capturing therefore wins over the piano's request, and the previous type is
// restored when neither applies. The app's TypeScript config has no DOM lib, so
// the slice used is structural.
type AudioSessionLike = { type: string };

export type AudioSessionLease = {
  /** Asks for it; harmless to repeat. */
  request: () => void;
  /** Lets go; harmless to repeat. */
  release: () => void;
};

const PLAYBACK = 'playback';
const PLAY_AND_RECORD = 'play-and-record';

/**
 * What the session is while the microphone is open (a Settings experiment, to
 * find what keeps Bluetooth earbuds out of iOS's thin call mode):
 *  - `play-and-record`: the type for playing and capturing at once (default);
 *  - `auto`: the page asks for nothing; the browser decides;
 *  - `playback-after-open`: `play-and-record` only to start the capture, then
 *    `playback` once the stream is running (some iOS versions keep capturing).
 */
export type AudioRoute = 'play-and-record' | 'auto' | 'playback-after-open';

export const DEFAULT_AUDIO_ROUTE: AudioRoute = 'play-and-record';

/** Release it when the microphone closes; `opened` says the stream is running. */
export type CaptureHold = (() => void) & { opened: () => void };

type Hold = { route: AudioRoute; isOpened: boolean };

export const createAudioSessionArbiter = (
  getSession: () => AudioSessionLike | undefined,
) => {
  let wantsPlayback = false;
  const holds = new Set<Hold>();
  let previousType: string | null = null;

  const setType = (session: AudioSessionLike, type: string) => {
    try {
      session.type = type;
    } catch {
      // A browser that refuses the type; things go on as they were.
    }
  };

  const wantedWhileCapturing = (): string | null => {
    const types = [...holds].map((hold) => {
      if (hold.route === 'auto') {
        return null;
      }

      return hold.route === 'playback-after-open' && hold.isOpened
        ? PLAYBACK
        : PLAY_AND_RECORD;
    });

    if (types.includes(PLAY_AND_RECORD)) {
      return PLAY_AND_RECORD;
    }

    return types.includes(PLAYBACK) ? PLAYBACK : null;
  };

  const apply = () => {
    const session = getSession();

    if (!session) {
      return;
    }

    // Capturing needs input (and so wins over the piano's request); with no
    // capture the piano's request; otherwise nothing.
    const wanted =
      holds.size > 0 ? wantedWhileCapturing() : wantsPlayback ? PLAYBACK : null;

    if (wanted !== null) {
      if (previousType === null) {
        previousType = session.type;
      }

      setType(session, wanted);

      return;
    }

    if (previousType !== null) {
      const type = previousType;

      previousType = null;
      setType(session, type);
    }
  };

  return {
    /** The piano: audible on the silent switch (`playback`) while nothing captures. */
    playbackLease: (): AudioSessionLease => ({
      request: () => {
        if (!wantsPlayback) {
          wantsPlayback = true;
          apply();
        }
      },
      release: () => {
        if (wantsPlayback) {
          wantsPlayback = false;
          apply();
        }
      },
    }),
    /**
     * The microphone is open: the session follows `route` until the returned
     * function is called (once), whatever else is playing.
     */
    holdCapture: (route: AudioRoute = DEFAULT_AUDIO_ROUTE): CaptureHold => {
      const hold: Hold = { route, isOpened: false };

      holds.add(hold);
      apply();

      const release = () => {
        if (holds.delete(hold)) {
          apply();
        }
      };
      const opened = () => {
        if (holds.has(hold) && !hold.isOpened) {
          hold.isOpened = true;
          apply();
        }
      };

      return Object.assign(release, { opened });
    },
  };
};
