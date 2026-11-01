import {
  formatRecordingDuration,
  getRecordedTrackRange,
  type Recording,
} from '@org/audio-library-models';

/**
 * How a recording is described in words, shared by the save sheet and the
 * Recordings panel (rehearsal-recording design Decisions 9 and 10): the part
 * of the track it covers, as marker names and as plain times, and the speed
 * and pitch it was recorded against.
 */

const MARKER_ARROW = ' → ';
const RANGE_DASH = '–';

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

export const formatRange = (startMs: number, endMs: number): string => {
  return `${formatRecordingDuration(startMs)}${RANGE_DASH}${formatRecordingDuration(endMs)}`;
};

const formatSpeed = (rate: number): string => {
  return `${Number(rate.toFixed(2))}×`;
};

const formatPitch = (semitones: number): string => {
  return `${semitones > 0 ? '+' : ''}${semitones}`;
};

/** `recorded against 0.7× +2`, or nothing when the track played unshaped. */
export const describeShaping = (
  shaping: Recording['shaping'],
): string | null => {
  const parts = [
    shaping.rate === 1 ? null : formatSpeed(shaping.rate),
    shaping.pitchSemitones === 0 ? null : formatPitch(shaping.pitchSemitones),
  ].filter((part): part is string => part !== null);

  return parts.length > 0 ? `recorded against ${parts.join(' ')}` : null;
};

/** The marker at or just before a position, from the markers the recording saved. */
const markerNameAt = (
  markers: Recording['markers'],
  positionMs: number,
): string | undefined => {
  return [...markers]
    .filter((marker) => marker.positionMs <= positionMs)
    .sort((a, b) => a.positionMs - b.positionMs)
    .at(-1)?.name;
};

export const describeMarkerSpan = (
  recording: Recording,
  range: { startMs: number; endMs: number },
): string | undefined => {
  const from = markerNameAt(recording.markers, range.startMs);
  const to = markerNameAt(recording.markers, range.endMs);

  if (from && to && from !== to) {
    return `${from}${MARKER_ARROW}${to}`;
  }

  return from ?? to;
};

/** First to last moment of recording time that had the track moving. */
export const getRecordedSpan = (recording: Recording) => {
  const moving = recording.timeline.filter((segment) => !segment.held);

  return moving.length === 0
    ? { startMs: 0, endMs: recording.durationMs }
    : {
        startMs: Math.min(...moving.map((s) => s.recordingStartMs)),
        endMs: Math.max(...moving.map((s) => s.recordingEndMs)),
      };
};

/** `0.7×, +2`, or `null` when the track played unshaped. */
export const formatRecordingShaping = (
  shaping: Recording['shaping'],
): string | null => {
  const parts = [
    shaping.rate === 1 ? null : formatSpeed(shaping.rate),
    shaping.pitchSemitones === 0 ? null : formatPitch(shaping.pitchSemitones),
  ].filter((part): part is string => part !== null);

  return parts.length > 0 ? parts.join(', ') : null;
};

/**
 * Where on the track a recording is, for a list row: its marker span when the
 * track has markers there, else its plain track times, else `Whole recording`.
 */
export const describeRecordingSpan = (recording: Recording): string => {
  const range = getRecordedTrackRange(recording);

  if (!range) {
    return 'Track held';
  }

  return (
    describeMarkerSpan(recording, range) ??
    formatRange(range.startMs, range.endMs)
  );
};
