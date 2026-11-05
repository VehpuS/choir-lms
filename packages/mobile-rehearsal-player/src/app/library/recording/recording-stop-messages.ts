import type { RecordingStopReason } from './recorder-types';

export type RecordingStopMessage = {
  /** Plain words for the strip or the save sheet. */
  message: string;
  /** Whether the stop lost or may have lost audio, so the message is a warning. */
  isProblem: boolean;
  /** Whether to offer `Export` of what was saved before anything else is lost. */
  offerExport: boolean;
  /** The user pressed Stop: the take saved as expected, so there is nothing to explain. */
  isUserStop?: boolean;
};

const MESSAGES: Record<RecordingStopReason, RecordingStopMessage> = {
  user: {
    message: 'Recording saved.',
    isProblem: false,
    isUserStop: true,
    offerExport: false,
  },
  hidden: {
    message:
      'Recording stopped when the app went to the background. It was saved.',
    isProblem: false,
    offerExport: false,
  },
  'track-ended': {
    message: 'Recording stopped at the end of the track. It was saved.',
    isProblem: false,
    offerExport: false,
  },
  'out-point': {
    message: 'Recording stopped at the end of the range. It was saved.',
    isProblem: false,
    offerExport: false,
  },
  interrupted: {
    message:
      'Recording stopped because the microphone was interrupted. What was captured was saved.',
    isProblem: false,
    offerExport: false,
  },
  'microphone-ended': {
    message:
      'Recording stopped because the microphone was disconnected. What was captured was saved.',
    isProblem: false,
    offerExport: false,
  },
  'storage-full': {
    message:
      'Storage is full, so the recording stopped. Everything recorded up to that point was saved.',
    isProblem: true,
    offerExport: true,
  },
  'storage-failed': {
    message:
      'The recording could not be fully saved because writing to storage failed. What was saved before the failure is kept.',
    isProblem: true,
    offerExport: true,
  },
  'too-long': {
    message:
      'Recording stopped because it reached the largest size the audio format allows. It was saved.',
    isProblem: false,
    offerExport: false,
  },
};

const NOTHING_SAVED =
  'The recording could not be saved because writing to storage failed, and almost nothing had been captured.';

const TOO_SHORT: RecordingStopMessage = {
  message: 'That recording was too short to keep, so nothing was saved.',
  isProblem: false,
  offerExport: false,
};

/**
 * What to tell the user once a recording has stopped (rehearsal-recording
 * design Decision 8). A recording that stopped because storage failed keeps
 * every chunk written before the failure, and the message says so and offers
 * `Export` while that audio can still be moved elsewhere.
 */
export const describeRecordingStop = (
  reason: RecordingStopReason,
  outcome: 'saved' | 'discarded' = 'saved',
): RecordingStopMessage => {
  if (outcome === 'saved') {
    return MESSAGES[reason];
  }

  // Nothing was kept, so there is nothing to export; a storage failure still
  // says why instead of calling the take too short.
  return MESSAGES[reason].isProblem
    ? { ...MESSAGES[reason], offerExport: false, message: NOTHING_SAVED }
    : TOO_SHORT;
};
