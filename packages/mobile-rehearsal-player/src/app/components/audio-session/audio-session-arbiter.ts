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

export const createAudioSessionArbiter = (
  getSession: () => AudioSessionLike | undefined,
) => {
  let wantsPlayback = false;
  // One entry per open capture; each is released once.
  const holds = new Set<object>();
  let previousType: string | null = null;
  const captureListeners = new Set<() => void>();

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

    // Capturing needs input (and so wins over the piano's request); with no
    // capture the piano's request; otherwise nothing.
    const wanted =
      holds.size > 0 ? PLAY_AND_RECORD : wantsPlayback ? PLAYBACK : null;

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

  // Only the edges matter to listeners: the first hold, and the last release.
  const notifyCapture = (wasCapturing: boolean) => {
    if (wasCapturing !== holds.size > 0) {
      captureListeners.forEach((listener) => listener());
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
     * The microphone is open: the session is `play-and-record` until the
     * returned function is called (once), whatever else is playing.
     */
    holdCapture: (): (() => void) => {
      const hold = {};

      const wasCapturing = holds.size > 0;

      holds.add(hold);
      apply();
      notifyCapture(wasCapturing);

      return () => {
        if (holds.delete(hold)) {
          apply();
          notifyCapture(true);
        }
      };
    },
    /** Whether any microphone is open now. */
    isCapturing: (): boolean => holds.size > 0,
    /** Called when the first microphone opens and when the last one closes. */
    subscribeCapture: (listener: () => void) => {
      captureListeners.add(listener);

      return () => {
        captureListeners.delete(listener);
      };
    },
  };
};
