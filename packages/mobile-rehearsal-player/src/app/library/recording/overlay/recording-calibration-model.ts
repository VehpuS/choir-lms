import type {
  CalibrationFailure,
  CalibrationOutcome,
} from './click-calibration-run';
import { formatNudge } from './recording-sync-model';

/** Copy and state for the calibration sheet, from the approved mock (task 1.5). */

export const CALIBRATION_TITLE = 'Calibrate with clicks';
export const CALIBRATION_ENTRY_LABEL = 'Measure with clicks (optional)…';
export const CALIBRATION_INTRO =
  "Optional. The app plays a few clicks and listens for them to measure your device's delay. The clicks must reach the microphone: use speakers, or hold one headphone against the microphone. You can always adjust by hand with “Sync” instead.";
export const CALIBRATION_RUNNING = 'Playing clicks and listening…';
export const CALIBRATION_PLAY_LABEL = 'Play clicks';
export const CALIBRATION_RETRY_LABEL = 'Try again';
export const CALIBRATION_MANUAL_LABEL = 'Adjust by hand';
export const CALIBRATION_CANCEL_LABEL = 'Cancel';
export const CALIBRATION_DONE_LABEL = 'Done';

const NOT_HEARD =
  'The clicks were not heard. Use speakers, or hold a headphone against the microphone, then try again. Your previous value is unchanged.';

const FAILURE_MESSAGES: Record<CalibrationFailure, string> = {
  'not-heard': NOT_HEARD,
  inconsistent:
    'The clicks did not agree with each other, which usually means noise or an echoing room. Try again somewhere quieter, or adjust by hand with “Sync”. Your previous value is unchanged.',
  'no-clock':
    'This browser cannot line the microphone up with the output, so it cannot measure. Adjust by hand with “Sync” instead. Your previous value is unchanged.',
  denied:
    'The microphone is blocked for this site. Allow it in the browser, or adjust by hand with “Sync”. Your previous value is unchanged.',
  unavailable:
    'No microphone could be opened. Adjust by hand with “Sync” instead. Your previous value is unchanged.',
  'in-use':
    'The microphone is being used by something else. Close it and try again, or adjust by hand with “Sync”.',
};

export type CalibrationPhase =
  | { kind: 'intro' }
  | { kind: 'running' }
  | { kind: 'ok'; latencyMs: number }
  | { kind: 'failed'; message: string };

/** What the sheet shows once a run ends; a cancelled run goes back to the start. */
export const phaseFromOutcome = (
  outcome: CalibrationOutcome,
): CalibrationPhase => {
  if (outcome.kind === 'measured') {
    return { kind: 'ok', latencyMs: outcome.latencyMs };
  }

  return outcome.kind === 'failed'
    ? { kind: 'failed', message: FAILURE_MESSAGES[outcome.reason] }
    : { kind: 'intro' };
};

export const describeMeasured = (
  latencyMs: number,
  deviceKey: string,
): string => {
  return `Measured ${formatNudge(latencyMs).replace(/^\+/, '')} for this output. Saved as the default for “${deviceKey}”. Existing recordings keep what they were recorded with.`;
};
