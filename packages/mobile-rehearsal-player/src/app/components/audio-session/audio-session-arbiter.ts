// The page's audio session, where the browser has one (iOS Safari 16.4 and
// later; the Audio Session API, `navigator.audioSession`). Two parts of the app
// want opposite things from it:
//  - The piano plays Web Audio, which on iOS follows the silent switch unless
//    the session is `playback`, so it asks for `playback` while it is open.
//  - The microphone (pitch detection, recording) needs input, which `playback`
//    does not have: a page that keeps it gets "No microphone found". The
//    browser's own choice (the type before the piano asked, normally `auto`)
//    switches to play-and-record when capture starts.
// So the piano's request only applies while nothing is capturing, and the
// previous type is restored whenever it does not apply. The app's TypeScript
// config has no DOM lib, so the slice used is structural.
type AudioSessionLike = { type: string };

export type AudioSessionLease = {
  /** Asks for it; harmless to repeat. */
  request: () => void;
  /** Lets go; harmless to repeat. */
  release: () => void;
};

const PLAYBACK = 'playback';

export const createAudioSessionArbiter = (
  getSession: () => AudioSessionLike | undefined,
) => {
  let wantsPlayback = false;
  let captures = 0;
  let previousType: string | null = null;

  const setType = (session: AudioSessionLike, type: string) => {
    try {
      session.type = type;
    } catch {
      // A browser that refuses the type; things go on as they were.
    }
  };

  const apply = () => {
    const session = getSession();

    if (!session) {
      return;
    }

    if (wantsPlayback && captures === 0) {
      if (previousType === null) {
        previousType = session.type;
      }

      setType(session, PLAYBACK);

      return;
    }

    if (previousType !== null) {
      const type = previousType;

      previousType = null;
      setType(session, type);
    }
  };

  return {
    /** The piano: audible on the silent switch, while nothing is capturing. */
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
     * The microphone is open: give the session back to the browser until the
     * returned function is called (once).
     */
    holdCapture: (): (() => void) => {
      let isHeld = true;

      captures += 1;
      apply();

      return () => {
        if (!isHeld) {
          return;
        }

        isHeld = false;
        captures -= 1;
        apply();
      };
    },
  };
};
