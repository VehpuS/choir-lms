import {
  formatRecordingDuration,
  formatRecordingSize,
  getRecordedTrackRange,
  type Recording,
} from '@org/audio-library-models';

import {
  describeMarkerSpan,
  describeShaping,
  formatRange,
  getRecordedSpan,
} from './recording-description';

import type { RecordingStopMessage } from './recording-stop-messages';

export const MAX_RECORDING_NAME_LENGTH = 80;

export const SAVE_SHEET_COPY = {
  title: 'Recording saved',
  nameLabel: 'Name',
  storedNote:
    'Saved on this device. Recordings are never removed automatically.',
  autoExportOff: 'Auto-export is off',
  autoExportOffDetail: 'Copy new recordings to Drive automatically.',
  autoExportOn: 'Auto-export is on',
  turnOnLabel: 'Turn on…',
  exportLabel: 'Export…',
  deleteLabel: 'Delete',
  confirmDeleteLabel: 'Tap again to delete',
  doneLabel: 'Done',
} as const;

/** What the auto-export setting amounts to for this recording (design Decision 19). */
export type AutoExportState =
  | { kind: 'off' }
  | {
      kind: 'on';
      what: 'recording' | 'mix' | 'both';
      folderName: string;
      wifiOnly: boolean;
      /** Upload progress, when an upload is running. */
      percent?: number;
    };

export type SaveSheetAutoExport = {
  title: string;
  detail: string;
  /** Present only when the setting is off. */
  turnOn?: { label: string };
  percent?: number;
};

export type SaveSheetModel = {
  title: string;
  /** `0:42 · 3.6 MB · recorded against 0.7× +2`. */
  summary: string;
  /** `Verse 2 → Chorus`, absent when the track has no marker near the span. */
  markerSpan?: string;
  /** `Track 0:38–1:20 · recording 0:00–0:42`, absent when the track never advanced. */
  timeSpan?: string;
  /** Why the take stopped, when that is worth a warning. */
  notice?: string;
  storedNote: string;
  autoExport: SaveSheetAutoExport;
};

const AUTO_EXPORT_WHAT = {
  recording: 'the recording',
  mix: 'the mix',
  both: 'the recording and the mix',
} as const;

const describeAutoExport = (state: AutoExportState): SaveSheetAutoExport => {
  if (state.kind === 'off') {
    return {
      title: SAVE_SHEET_COPY.autoExportOff,
      detail: SAVE_SHEET_COPY.autoExportOffDetail,
      turnOn: { label: SAVE_SHEET_COPY.turnOnLabel },
    };
  }

  const where = `${state.folderName}${state.wifiOnly ? ' (Wi-Fi only)' : ''}`;

  return {
    title: SAVE_SHEET_COPY.autoExportOn,
    detail: `Uploading ${AUTO_EXPORT_WHAT[state.what]} to ${where}…`,
    ...(state.percent === undefined ? {} : { percent: state.percent }),
  };
};

export type SaveSheetInput = {
  recording: Recording;
  autoExport: AutoExportState;
  /** How the take stopped, so a lost-audio stop is not hidden behind the name. */
  stop?: RecordingStopMessage;
};

/**
 * What the save sheet says about a recording just saved (rehearsal-recording
 * design Decisions 8 and 19): its size, which part of the track it covers in
 * marker names and in plain times, where it lives, and the auto-export state.
 */
export const getSaveSheetModel = (input: SaveSheetInput): SaveSheetModel => {
  const { recording, stop } = input;
  const trackRange = getRecordedTrackRange(recording);
  const recorded = getRecordedSpan(recording);
  const markerSpan = trackRange
    ? describeMarkerSpan(recording, trackRange)
    : undefined;

  return {
    title: SAVE_SHEET_COPY.title,
    summary: [
      formatRecordingDuration(recording.durationMs),
      formatRecordingSize(recording.sizeBytes),
      describeShaping(recording.shaping),
    ]
      .filter(Boolean)
      .join(' · '),
    ...(markerSpan ? { markerSpan } : {}),
    ...(trackRange
      ? {
          timeSpan: `Track ${formatRange(trackRange.startMs, trackRange.endMs)} · recording ${formatRange(recorded.startMs, recorded.endMs)}`,
        }
      : {}),
    ...(stop?.isProblem ? { notice: stop.message } : {}),
    storedNote: SAVE_SHEET_COPY.storedNote,
    autoExport: describeAutoExport(input.autoExport),
  };
};

/**
 * The name to save from what was typed: trimmed and capped, or the current
 * name when nothing usable was typed (a name is never left blank).
 */
export const resolveRecordingName = (
  typed: string,
  currentName: string,
): string => {
  const trimmed = typed.trim().slice(0, MAX_RECORDING_NAME_LENGTH).trim();

  return trimmed.length > 0 ? trimmed : currentName;
};
