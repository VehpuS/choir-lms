import { isString } from 'es-toolkit';

import type {
  LibraryBundleRecording,
  LibraryBundleRecordingAudio,
} from './library-bundle.ts';
import { isRawRecord } from './library-bundle-entities.ts';
import {
  clampNudgeMs,
  clampRecordingBalance,
  clampRecordingLevelDb,
  type RecordingMarker,
  type RecordingPunch,
  type RecordingTimelineSegment,
} from './recording.ts';

const isNonEmptyString = (value: unknown): value is string =>
  isString(value) && value.trim().length > 0;

const isFiniteNumber = (value: unknown): value is number =>
  typeof value === 'number' && Number.isFinite(value);

const parseAudio = (value: unknown): LibraryBundleRecordingAudio => {
  return isRawRecord(value) &&
    value.kind === 'drive' &&
    isNonEmptyString(value.driveFileId)
    ? {
        kind: 'drive',
        driveFileId: value.driveFileId,
        fileName: isString(value.fileName) ? value.fileName : '',
      }
    : { kind: 'not-uploaded' };
};

const parseTimeline = (value: unknown): RecordingTimelineSegment[] => {
  return (Array.isArray(value) ? value : []).flatMap((entry) => {
    return isRawRecord(entry) &&
      isFiniteNumber(entry.recordingStartMs) &&
      isFiniteNumber(entry.recordingEndMs) &&
      isFiniteNumber(entry.trackStartMs)
      ? [
          {
            recordingStartMs: entry.recordingStartMs,
            recordingEndMs: entry.recordingEndMs,
            trackStartMs: entry.trackStartMs,
            held: entry.held === true,
          },
        ]
      : [];
  });
};

const parseMarkers = (value: unknown): RecordingMarker[] => {
  return (Array.isArray(value) ? value : []).flatMap((entry) => {
    return isRawRecord(entry) &&
      isString(entry.name) &&
      isFiniteNumber(entry.positionMs)
      ? [{ name: entry.name, positionMs: entry.positionMs }]
      : [];
  });
};

const parsePunch = (value: unknown): RecordingPunch | undefined => {
  return isRawRecord(value) &&
    isFiniteNumber(value.inMs) &&
    isFiniteNumber(value.outMs) &&
    isFiniteNumber(value.preRollMs)
    ? { inMs: value.inMs, outMs: value.outMs, preRollMs: value.preRollMs }
    : undefined;
};

/**
 * Reads one recording's metadata. Whether its lineage resolves inside the
 * bundle is decided by the bundle parser; this checks shape only.
 */
export const parseBundleRecording = (
  value: unknown,
): LibraryBundleRecording | null => {
  if (
    !isRawRecord(value) ||
    !isNonEmptyString(value.id) ||
    !isRawRecord(value.lineage) ||
    !isNonEmptyString(value.lineage.trackId) ||
    !isRawRecord(value.source) ||
    !isNonEmptyString(value.source.driveFileId) ||
    !isRawRecord(value.shaping) ||
    !isFiniteNumber(value.shaping.rate) ||
    !isFiniteNumber(value.shaping.pitchSemitones) ||
    !isFiniteNumber(value.durationMs) ||
    !isFiniteNumber(value.sampleRate) ||
    !isFiniteNumber(value.sizeBytes)
  ) {
    return null;
  }

  const { lineage, source, shaping } = value;
  const punch = parsePunch(value.punch);

  return {
    id: value.id,
    name: isString(value.name) ? value.name : '',
    createdAt: isString(value.createdAt) ? value.createdAt : '',
    durationMs: value.durationMs,
    sampleRate: value.sampleRate,
    sizeBytes: value.sizeBytes,
    appliedLatencyMs: isFiniteNumber(value.appliedLatencyMs)
      ? value.appliedLatencyMs
      : 0,
    nudgeMs: clampNudgeMs(isFiniteNumber(value.nudgeMs) ? value.nudgeMs : 0),
    source: {
      driveFileId: source.driveFileId as string,
      name: isString(source.name) ? source.name : '',
      ...(isString(source.contentVersion)
        ? { contentVersion: source.contentVersion }
        : {}),
      ...(isFiniteNumber(source.durationMs)
        ? { durationMs: source.durationMs }
        : {}),
    },
    lineage: {
      trackId: lineage.trackId as string,
      ...(isNonEmptyString(lineage.adjustedId)
        ? { adjustedId: lineage.adjustedId }
        : {}),
      ...(isNonEmptyString(lineage.loopId) ? { loopId: lineage.loopId } : {}),
    },
    shaping: {
      rate: shaping.rate as number,
      pitchSemitones: shaping.pitchSemitones as number,
    },
    balance: clampRecordingBalance(
      isFiniteNumber(value.balance) ? value.balance : Number.NaN,
    ),
    ...(isFiniteNumber(value.levelDb)
      ? { levelDb: clampRecordingLevelDb(value.levelDb) }
      : {}),
    engineVersion: isFiniteNumber(value.engineVersion)
      ? value.engineVersion
      : 0,
    markers: parseMarkers(value.markers),
    ...(punch ? { punch } : {}),
    timeline: parseTimeline(value.timeline),
    audio: parseAudio(value.audio),
  };
};
