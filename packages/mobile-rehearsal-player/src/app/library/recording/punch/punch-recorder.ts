import type { PunchPhase, PunchRecorder } from '@org/audio-mixing';

import type { RecordingStopReason } from '../recorder-types';

type PunchRecorderOptions = {
  /** Starts the session's take for the armed range. */
  start: () => void;
  stop: (reason: RecordingStopReason) => void;
  /** The machine's phase, already updated when its effect runs. */
  getPhase: () => PunchPhase;
};

/**
 * The recording half of a punch controller: it starts and stops the session's
 * take, and tells the stop at the out point apart from the user's own stop so
 * the strip can say which it was.
 */
export const createPunchRecorder = (
  options: PunchRecorderOptions,
): PunchRecorder => ({
  start: options.start,
  stop: () =>
    options.stop(
      options.getPhase() === 'stopped-at-out' ? 'out-point' : 'user',
    ),
});
