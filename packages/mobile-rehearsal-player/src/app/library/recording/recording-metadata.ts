import {
  DEFAULT_RECORDING_BALANCE,
  getRecordedTrackRange,
  nextRecordingName,
  type DriveAudioSource,
  type NamedLoop,
  type PlaybackShaping,
  type Recording,
  type RecordingMarker,
  type RecordingPunch,
  type RecordingTimelineSegment,
  type TrackMarker,
} from '@org/audio-library-models';
import { MIX_ENGINE_VERSION } from '@org/audio-mixing';

/**
 * Captures what makes a recording self-contained (rehearsal-recording design
 * Decision 9). Everything is copied by value when recording starts, so a
 * renamed track, moved markers, a deleted loop, or a replaced file later never
 * changes what the recording says about itself. No track audio is copied: the
 * `source` only says which file and which version to fetch.
 */

export type RecordingStartInput = {
  id: string;
  createdAt: string;
  /** What is playing: the saved track, or a saved adjusted copy of it. */
  playing: DriveAudioSource;
  /** The saved track itself; the same as `playing` unless that is an adjusted copy. */
  parent: DriveAudioSource;
  /** The active loop, which then owns the recording. */
  loop?: NamedLoop | null;
  /** The speed and pitch in effect now; read once and fixed for the recording. */
  shaping: PlaybackShaping;
  /** The owner's markers, as resolved through the markers owner. */
  markers: readonly TrackMarker[];
  existingNames: readonly string[];
  appliedLatencyMs: number;
  punch?: RecordingPunch;
};

/** A recording as it is known when it starts, before any audio exists. */
export type RecordingDraft = Omit<
  Recording,
  'durationMs' | 'markers' | 'sampleRate' | 'sizeBytes' | 'timeline'
> & { markerSnapshot: RecordingMarker[] };

export type RecordingOutcome = {
  durationMs: number;
  sampleRate: number;
  sizeBytes: number;
  timeline: RecordingTimelineSegment[];
};

export const captureRecordingStart = (
  input: RecordingStartInput,
): RecordingDraft => {
  const { playing, parent, loop, shaping } = input;

  if (parent.adjustment) {
    throw new Error(
      'A recording belongs to a saved track, not an adjusted copy.',
    );
  }

  return {
    id: input.id,
    name: nextRecordingName(input.existingNames),
    createdAt: input.createdAt,
    appliedLatencyMs: input.appliedLatencyMs,
    nudgeMs: 0,
    source: {
      driveFileId: parent.driveFileId,
      name: parent.name,
      contentVersion: parent.modifiedTime,
      durationMs: parent.durationMs,
    },
    lineage: {
      track: {
        id: parent.id,
        driveFileId: parent.driveFileId,
        name: parent.name,
      },
      ...(playing.adjustment
        ? {
            adjusted: {
              id: playing.id,
              name: playing.name,
              transform: playing.adjustment.transform,
            },
          }
        : {}),
      ...(loop
        ? {
            loop: {
              id: loop.id,
              name: loop.name,
              startMs: loop.startMs,
              endMs: loop.endMs,
            },
          }
        : {}),
    },
    shaping: {
      rate: shaping.speedMultiplier,
      pitchSemitones: shaping.pitchSemitones,
    },
    balance: DEFAULT_RECORDING_BALANCE,
    engineVersion: MIX_ENGINE_VERSION,
    markerSnapshot: input.markers.map(({ name, positionMs }) => ({
      name,
      positionMs,
    })),
    ...(input.punch ? { punch: { ...input.punch } } : {}),
  };
};

/**
 * Closes the draft with what was recorded. The stored markers are the ones
 * inside the span the timeline actually covered.
 */
export const completeRecording = (
  draft: RecordingDraft,
  outcome: RecordingOutcome,
): Recording => {
  const { markerSnapshot, ...rest } = draft;
  const range = getRecordedTrackRange({
    shaping: draft.shaping,
    timeline: outcome.timeline,
  });
  const markers = range
    ? markerSnapshot
        .filter(
          (marker) =>
            marker.positionMs >= range.startMs &&
            marker.positionMs <= range.endMs,
        )
        .sort((a, b) => a.positionMs - b.positionMs)
    : [];

  return { ...rest, ...outcome, markers };
};
