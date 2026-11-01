import { formatRecordingDuration } from '@org/audio-library-models';

import {
  formatMarkerReference,
  type MarkerContext,
} from './recording-marker-context';
import type { RecordingSessionState } from './recording-session';
import type { TimeLeftReadout } from './recording-storage-limit';

export const RECORDING_STRIP_COPY = {
  continueLabel: 'Continue',
  dismissLabel: 'Dismiss',
  explainBody:
    'It is saved under this track and never removed automatically; only you delete it. You can export it or copy it to Drive. Use headphones.',
  explainTitle: 'Recording keeps audio on this device.',
  noTrackBody: 'Play or open a track to record with it.',
  noTrackTitle: 'No track loaded.',
  notNowLabel: 'Not now',
  readyBody: 'Seek to where you want to start.',
  readyTitle: 'Ready.',
  recordLabel: 'Record',
  refusedBody:
    'Export or delete recordings under “Settings”, then “Recordings”, to make room.',
  refusedTitle: 'Not enough space to record.',
  settingsLabel: 'Settings',
  stopLabel: 'Stop recording',
} as const;

const BLOCKED_COPY = {
  denied: {
    title: 'Microphone blocked.',
    body: "Allow it for this site in the browser's settings, then press “Record”.",
  },
  'in-use': {
    title: 'Microphone in use.',
    body: 'Another app or tab is using it. Close it, then press “Record”.',
  },
  unavailable: {
    title: 'No microphone found.',
    body: 'Connect or enable a microphone, then press “Record”.',
  },
} as const;

export type StripAction =
  | 'continue'
  | 'not-now'
  | 'record'
  | 'stop'
  | 'dismiss'
  | 'open-settings';

export type StripButton = { action: StripAction; label: string };

export type RecordingStripModel =
  | { kind: 'no-track'; title: string; body: string }
  | {
      kind: 'explain';
      title: string;
      body: string;
      primary: StripButton;
      secondary: StripButton;
    }
  | { kind: 'blocked'; title: string; body: string; primary: StripButton }
  | { kind: 'refused'; title: string; body: string; primary: StripButton }
  | {
      kind: 'ready';
      title: string;
      body: string;
      timeLeft: TimeLeftReadout | null;
      primary: StripButton;
    }
  | {
      kind: 'recording';
      /** The elapsed time, `m:ss`. */
      clock: string;
      timeLeft: TimeLeftReadout | null;
      passed?: string;
      next?: string;
      stop: StripButton;
      accessibilityLabel: string;
    }
  | {
      kind: 'stopped';
      message: string;
      isProblem: boolean;
      primary: StripButton;
    };

export type RecordingStripInput = {
  hasTrack: boolean;
  session: RecordingSessionState;
  markers: MarkerContext;
};

/**
 * What the recording strip shows (design Decisions 8, 17 and 20): a state per
 * moment, with one clear action each. The indicator, the clock and the stop
 * control stay on screen for as long as audio is being captured.
 */
export const getRecordingStripModel = (
  input: RecordingStripInput,
): RecordingStripModel => {
  const { session } = input;

  if (session.phase === 'recording') {
    const clock = formatRecordingDuration(session.elapsedMs);

    return {
      kind: 'recording',
      clock,
      timeLeft: session.timeLeft,
      ...(input.markers.passed
        ? { passed: `Passed ${formatMarkerReference(input.markers.passed)}` }
        : {}),
      ...(input.markers.next
        ? { next: `Next ${formatMarkerReference(input.markers.next)}` }
        : {}),
      stop: { action: 'stop', label: RECORDING_STRIP_COPY.stopLabel },
      accessibilityLabel: `Recording, ${clock}`,
    };
  }

  if (session.phase === 'stopped' && session.stopMessage) {
    return {
      kind: 'stopped',
      message: session.stopMessage.message,
      isProblem: session.stopMessage.isProblem,
      primary: { action: 'dismiss', label: RECORDING_STRIP_COPY.dismissLabel },
    };
  }

  if (session.phase === 'explain') {
    return {
      kind: 'explain',
      title: RECORDING_STRIP_COPY.explainTitle,
      body: RECORDING_STRIP_COPY.explainBody,
      primary: {
        action: 'continue',
        label: RECORDING_STRIP_COPY.continueLabel,
      },
      secondary: { action: 'not-now', label: RECORDING_STRIP_COPY.notNowLabel },
    };
  }

  if (session.phase === 'blocked') {
    const copy = BLOCKED_COPY[session.blockedReason ?? 'unavailable'];

    return {
      kind: 'blocked',
      ...copy,
      primary: { action: 'record', label: RECORDING_STRIP_COPY.recordLabel },
    };
  }

  if (session.phase === 'refused') {
    return {
      kind: 'refused',
      title: RECORDING_STRIP_COPY.refusedTitle,
      body: RECORDING_STRIP_COPY.refusedBody,
      primary: {
        action: 'open-settings',
        label: RECORDING_STRIP_COPY.settingsLabel,
      },
    };
  }

  if (!input.hasTrack) {
    return {
      kind: 'no-track',
      title: RECORDING_STRIP_COPY.noTrackTitle,
      body: RECORDING_STRIP_COPY.noTrackBody,
    };
  }

  return {
    kind: 'ready',
    title: RECORDING_STRIP_COPY.readyTitle,
    body: RECORDING_STRIP_COPY.readyBody,
    timeLeft: session.timeLeft,
    primary: { action: 'record', label: RECORDING_STRIP_COPY.recordLabel },
  };
};
