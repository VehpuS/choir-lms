import { formatRecordingDuration } from '@org/audio-library-models';

import {
  formatMarkerReference,
  type MarkerContext,
} from './recording-marker-context';
import type { PunchState } from '@org/audio-mixing';
import type { RecordingSessionState } from './recording-session';
import type { TimeLeftReadout } from './recording-storage-limit';

export const RECORDING_STRIP_COPY = {
  continueLabel: 'Continue',
  dismissLabel: 'Dismiss',
  explainBody:
    'It is saved under this track and never removed automatically; only you delete it. You can export it or copy it to Drive. Use headphones.',
  explainTitle: 'Recording keeps audio on this device.',
  armedBody: 'Press play to start. Stop cancels.',
  armedStopLabel: 'Cancel recording',
  armedTitle: 'Waiting for playback.',
  noTrackBody: 'Play or open a track to record with it.',
  noTrackTitle: 'No track loaded.',
  notNowLabel: 'Not now',
  readyBody: 'Seek to where you want to start.',
  readyTitle: 'Ready.',
  betweenLabel: 'Between…',
  disarmLabel: 'Disarm',
  playPunchLabel: 'Play',
  punchCountdownBody: 'Pre-roll playing.',
  recordLabel: 'Record',
  refusedBody:
    'Export or delete recordings under “Settings”, then “Recordings”, to make room.',
  refusedTitle: 'Not enough space to record.',
  settingsLabel: 'Settings',
  pausedStatus: 'Paused with track',
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
  | 'open-settings'
  | 'record-between'
  | 'play-punch'
  | 'disarm';

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
      /** `Record between…`, which opens the punch-range sheet. */
      between: StripButton;
    }
  | {
      kind: 'punch-armed';
      title: string;
      body: string;
      primary: StripButton;
      disarm: StripButton;
    }
  | {
      kind: 'punch-countdown';
      title: string;
      body: string;
      disarm: StripButton;
    }
  | {
      kind: 'armed';
      title: string;
      body: string;
      stop: StripButton;
    }
  | {
      kind: 'recording';
      /** The elapsed time, `m:ss`. */
      clock: string;
      /** `Paused with track` while the track is paused, else absent. */
      status?: string;
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
  /** An armed punch range and how to name its span, e.g. `Chorus → Bridge`. */
  punch?: { state: PunchState; span: string };
};

const DISARM: StripButton = {
  action: 'disarm',
  label: RECORDING_STRIP_COPY.disarmLabel,
};

/** The strip while a punch range waits for playback or counts down to its in point. */
const getPunchStrip = (
  punch: RecordingStripInput['punch'],
): RecordingStripModel | null => {
  const range = punch?.state.range;

  if (!punch || !range) {
    return null;
  }

  if (punch.state.phase === 'armed') {
    return {
      kind: 'punch-armed',
      title: `Armed · ${punch.span}`,
      body: `Press play to start ${formatSecondsLong(range.preRollMs)} before the in point.`,
      primary: {
        action: 'play-punch',
        label: RECORDING_STRIP_COPY.playPunchLabel,
      },
      disarm: DISARM,
    };
  }

  if (punch.state.phase === 'countdown') {
    return {
      kind: 'punch-countdown',
      title: `Recording in ${punch.state.countdownSeconds ?? 0}…`,
      body: RECORDING_STRIP_COPY.punchCountdownBody,
      disarm: DISARM,
    };
  }

  return null;
};

const MS_PER_SECOND = 1000;
const formatSecondsLong = (ms: number) => `${Math.round(ms / MS_PER_SECOND)} s`;

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
      ...(session.paused ? { status: RECORDING_STRIP_COPY.pausedStatus } : {}),
      timeLeft: session.timeLeft,
      ...(input.markers.passed
        ? { passed: `Passed ${formatMarkerReference(input.markers.passed)}` }
        : {}),
      ...(input.markers.next
        ? { next: `Next ${formatMarkerReference(input.markers.next)}` }
        : {}),
      stop: { action: 'stop', label: RECORDING_STRIP_COPY.stopLabel },
      accessibilityLabel: session.paused
        ? `Recording paused, ${clock}`
        : `Recording, ${clock}`,
    };
  }

  const punchStrip = getPunchStrip(input.punch);

  // A take being captured was handled above and always wins.
  if (punchStrip) {
    return punchStrip;
  }

  if (session.phase === 'armed') {
    return {
      kind: 'armed',
      title: RECORDING_STRIP_COPY.armedTitle,
      body: RECORDING_STRIP_COPY.armedBody,
      stop: { action: 'stop', label: RECORDING_STRIP_COPY.armedStopLabel },
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
    between: {
      action: 'record-between',
      label: RECORDING_STRIP_COPY.betweenLabel,
    },
  };
};
