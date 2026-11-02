import { clampNudgeMs, MAX_NUDGE_MS } from '@org/audio-library-models';
import type { Recording } from '@org/audio-library-models';
import { clamp, round } from 'es-toolkit';

/**
 * The numbers behind the sync control (rehearsal-recording design Decision 3).
 * A positive nudge plays the recording later against the track.
 */

export const SYNC_FINE_STEP_MS = 1;
export const SYNC_COARSE_STEP_MS = 10;
export const SYNC_MIN_MS = -MAX_NUDGE_MS;
export const SYNC_MAX_MS = MAX_NUDGE_MS;
/** The most compensation a device default may carry; generous for Bluetooth. */
export const MAX_DEVICE_LATENCY_MS = 1000;

export const SYNC_LABEL = 'Sync';
export const SYNC_RESET_LABEL = 'Reset';
export const SYNC_USE_FOR_DEVICE_LABEL = 'Use for this device';
export const SYNC_SHEET_TITLE = 'Sync';
export const SYNC_SHEET_EXPLANATION =
  'If your voice sounds early or late against the track, nudge it until it lines up. Changes sound at once and are saved with the recording.';
export const SYNC_CONTROL_LABEL = 'Sync nudge in milliseconds';
export const SYNC_SAVE_LABEL = 'Save';
export const SHARED_DEVICE_KEY = 'This browser';
export const SHARED_DEVICE_NOTE =
  'This browser does not say which output is in use, so the default applies to every output.';

/** Moves the nudge by `deltaMs`, staying inside the slider's range. */
export const stepNudge = (nudgeMs: number, deltaMs: number): number => {
  return clampNudgeMs(nudgeMs + deltaMs);
};

/** `+12 ms`, `−5 ms` or `0 ms`, with a true minus sign for reading. */
export const formatNudge = (nudgeMs: number): string => {
  const value = clampNudgeMs(nudgeMs);

  if (value === 0) {
    return '0 ms';
  }

  return `${value > 0 ? '+' : '−'}${Math.abs(value)} ms`;
};

/**
 * The compensation to start the next recording on this device with: what the
 * take was filed with, less the nudge the user needed. A nudge that plays the
 * recording later means the take was filed with too much compensation.
 */
export const deviceLatencyFromNudge = (
  recording: Pick<Recording, 'appliedLatencyMs' | 'nudgeMs'>,
  nudgeMs: number = recording.nudgeMs,
): number => {
  return round(
    clamp(
      recording.appliedLatencyMs - clampNudgeMs(nudgeMs),
      -MAX_NUDGE_MS,
      MAX_DEVICE_LATENCY_MS,
    ),
  );
};

/** Whether the nudge differs from what is saved for the device, so saving means something. */
export const canUseNudgeForDevice = (
  recording: Pick<Recording, 'appliedLatencyMs' | 'nudgeMs'>,
  nudgeMs: number,
  deviceLatencyMs: number | null,
): boolean => {
  return deviceLatencyFromNudge(recording, nudgeMs) !== (deviceLatencyMs ?? 0);
};

/** What the sheet promises: the compensation the next recordings on this output start with. */
export const describeDeviceDefault = (latencyMs: number): string => {
  return `Next recordings on this output start with ${formatNudge(latencyMs)} compensation already applied.`;
};
