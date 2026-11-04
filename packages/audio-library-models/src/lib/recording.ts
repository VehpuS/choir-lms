import { clamp, round } from 'es-toolkit';

import type { PlaybackShaping } from './playback-shaping.ts';
import type { TrackMarker } from './track-markers.ts';

/**
 * A recording is the singer's own audio, kept on the device, plus everything
 * needed to replay or mix it against its track without a copy of the track
 * (rehearsal-recording design Decision 9). Times are milliseconds. Track
 * positions are in the original audio's time, never in shaped time.
 */

export const MAX_RECORDING_DURATION_MS = 10 * 60 * 1000;
export const MIN_RECORDING_DURATION_MS = 1000;
export const MAX_NUDGE_MS = 250;
export const DEFAULT_RECORDING_BALANCE = 50;
export const MIN_RECORDING_BALANCE = 0;
export const MAX_RECORDING_BALANCE = 100;
/** The recording's own level, in decibels, from as recorded (0) to a boost (design Decision 21). */
export const DEFAULT_RECORDING_LEVEL_DB = 0;
export const MIN_RECORDING_LEVEL_DB = -12;
export const MAX_RECORDING_LEVEL_DB = 18;
const DB_PER_DECADE = 20;
const LEVEL_DB_STEP = 10;

const RECORDING_NAME_PREFIX = 'Recording';
const AUTOMATIC_RECORDING_NAME_PATTERN = /^Recording (\d+)$/;
const MS_PER_SECOND = 1000;
const SECONDS_PER_MINUTE = 60;
const BYTES_PER_KB = 1024;
const BYTES_PER_MB = BYTES_PER_KB * BYTES_PER_KB;
const PAD_WIDTH = 2;

/** The track audio a recording was sung against, so it can be found again. */
export type RecordingSource = {
  driveFileId: string;
  name: string;
  /** The `modifiedTime` the audio cache keys on; absent when Drive gave none. */
  contentVersion?: string;
  durationMs?: number;
};

/** The owner chain when the recording was made, kept even if it is deleted later. */
export type RecordingLineage = {
  track: { id: string; driveFileId: string; name: string };
  adjusted?: { id: string; name: string; transform: PlaybackShaping };
  loop?: { id: string; name: string; startMs: number; endMs: number };
};

/** Speed and pitch the track played with, fixed for the whole recording. */
export type RecordingShaping = {
  /** Track seconds covered per second of recording. */
  rate: number;
  pitchSemitones: number;
};

/**
 * One uninterrupted stretch of playback while recording. Track position moves
 * by `rate` per unit of recording time, or stays at `trackStartMs` when held
 * (the track was paused). Latency compensation is already inside the bounds.
 */
export type RecordingTimelineSegment = {
  recordingStartMs: number;
  recordingEndMs: number;
  trackStartMs: number;
  held: boolean;
};

export type RecordingPunch = {
  inMs: number;
  outMs: number;
  preRollMs: number;
};

export type RecordingExportKind = 'recording' | 'mix';

/** A copy of the recording that reached Drive. Drive copies are never deleted by the app. */
export type RecordingExportDone = {
  kind: RecordingExportKind;
  driveFileId: string;
  fileName: string;
  folderId: string;
  folderName: string;
  exportedAt: string;
};

/** An export that did not complete, kept so the row can say why and offer a retry. */
export type RecordingExportFailure = {
  kind: RecordingExportKind;
  reason: string;
  failedAt: string;
};

export type RecordingExports = {
  done: RecordingExportDone[];
  failed: RecordingExportFailure[];
};

export type RecordingMarker = Pick<TrackMarker, 'name' | 'positionMs'>;

export type Recording = {
  id: string;
  name: string;
  createdAt: string;
  durationMs: number;
  sampleRate: number;
  sizeBytes: number;
  /** Compensation applied while recording; the nudge is stored separately. */
  appliedLatencyMs: number;
  nudgeMs: number;
  source: RecordingSource;
  lineage: RecordingLineage;
  shaping: RecordingShaping;
  /** 0 is all track, 100 all recording; the default for exports and playlists. */
  balance: number;
  /**
   * The recording's loudness against the track, in dB. Absent on recordings made
   * before levels existed, which read as 0; use `getRecordingLevelDb`.
   */
  levelDb?: number;
  engineVersion: number;
  markers: RecordingMarker[];
  punch?: RecordingPunch;
  timeline: RecordingTimelineSegment[];
  /** What has been copied to Drive; absent on recordings made before exports were kept. */
  exports?: RecordingExports;
};

export type RecordingOwner =
  | { kind: 'loop'; id: string }
  | { kind: 'adjusted'; id: string }
  | { kind: 'track'; id: string };

/** The one entity a recording belongs to: the loop, else the adjusted track, else the track. */
export const getRecordingOwner = (
  recording: Pick<Recording, 'lineage'>,
): RecordingOwner => {
  const { adjusted, loop, track } = recording.lineage;

  if (loop) {
    return { kind: 'loop', id: loop.id };
  }

  return adjusted
    ? { kind: 'adjusted', id: adjusted.id }
    : { kind: 'track', id: track.id };
};

/** The smallest unused `Recording N` among the owner's existing names. */
export const nextRecordingName = (existingNames: readonly string[]): string => {
  const used = new Set<number>();

  for (const name of existingNames) {
    const match = AUTOMATIC_RECORDING_NAME_PATTERN.exec(name);

    if (match?.[1]) {
      used.add(Number(match[1]));
    }
  }

  let candidate = 1;

  while (used.has(candidate)) {
    candidate += 1;
  }

  return `${RECORDING_NAME_PREFIX} ${candidate}`;
};

/** Keeps a manual sync nudge inside the slider's range, in whole milliseconds. */
export const clampNudgeMs = (value: number): number => {
  return Number.isFinite(value)
    ? round(clamp(value, -MAX_NUDGE_MS, MAX_NUDGE_MS))
    : 0;
};

export const clampRecordingBalance = (value: number): number => {
  return Number.isFinite(value)
    ? round(clamp(value, MIN_RECORDING_BALANCE, MAX_RECORDING_BALANCE))
    : DEFAULT_RECORDING_BALANCE;
};

/** Keeps a level inside its range, in tenths of a dB; anything that is not a number is 0 dB. */
export const clampRecordingLevelDb = (value: number): number => {
  return Number.isFinite(value)
    ? Math.round(
        clamp(value, MIN_RECORDING_LEVEL_DB, MAX_RECORDING_LEVEL_DB) *
          LEVEL_DB_STEP,
      ) / LEVEL_DB_STEP
    : DEFAULT_RECORDING_LEVEL_DB;
};

/** The level a recording plays and mixes at; older recordings have none stored and read as 0 dB. */
export const getRecordingLevelDb = (
  recording: Pick<Recording, 'levelDb'>,
): number =>
  clampRecordingLevelDb(recording.levelDb ?? DEFAULT_RECORDING_LEVEL_DB);

/** Decibels as a gain factor: 0 dB is 1, +6 dB about 2. */
export const dbToLinear = (db: number): number =>
  Math.pow(LEVEL_DB_STEP, db / DB_PER_DECADE);

/** A gain factor in decibels; silence is minus infinity. */
export const linearToDb = (linear: number): number =>
  linear > 0 ? DB_PER_DECADE * Math.log10(linear) : Number.NEGATIVE_INFINITY;

/** `m:ss`, rounding down to whole seconds. */
export const formatRecordingDuration = (durationMs: number): string => {
  const totalSeconds = Math.max(0, Math.floor(durationMs / MS_PER_SECOND));
  const minutes = Math.floor(totalSeconds / SECONDS_PER_MINUTE);
  const seconds = totalSeconds % SECONDS_PER_MINUTE;

  return `${minutes}:${String(seconds).padStart(PAD_WIDTH, '0')}`;
};

/** `312 KB` below a megabyte, `4.8 MB` above. */
export const formatRecordingSize = (sizeBytes: number): string => {
  if (sizeBytes < BYTES_PER_MB) {
    return `${Math.max(0, Math.round(sizeBytes / BYTES_PER_KB))} KB`;
  }

  return `${(sizeBytes / BYTES_PER_MB).toFixed(1)} MB`;
};
