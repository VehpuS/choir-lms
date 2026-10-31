import type { Recording } from './recording.ts';

type TimelineRecording = Pick<Recording, 'shaping' | 'timeline'>;

/** A recording that starts and ends this close to the track's edges counts as whole-track. */
export const WHOLE_TRACK_EDGE_TOLERANCE_MS = 2000;

export type TrackRange = { startMs: number; endMs: number };

const segmentTrackEndMs = (
  segment: Recording['timeline'][number],
  rate: number,
) => {
  return segment.held
    ? segment.trackStartMs
    : segment.trackStartMs +
        (segment.recordingEndMs - segment.recordingStartMs) * rate;
};

/**
 * The track position the singer was hearing at a moment of the recording, or
 * `null` when the moment lies outside every segment.
 */
export const getTrackPositionAtRecordingMs = (
  recording: TimelineRecording,
  recordingMs: number,
): number | null => {
  const segment = recording.timeline.find(
    (candidate) =>
      recordingMs >= candidate.recordingStartMs &&
      recordingMs < candidate.recordingEndMs,
  );

  if (!segment) {
    return null;
  }

  return segment.held
    ? segment.trackStartMs
    : segment.trackStartMs +
        (recordingMs - segment.recordingStartMs) * recording.shaping.rate;
};

/**
 * Every recording time that was sung against a track position: one for a plain
 * recording, one per pass for a loop recording, in recording order. Held
 * stretches are skipped because the track was not advancing through them.
 */
export const getRecordingTimesAtTrackPosition = (
  recording: TimelineRecording,
  trackMs: number,
): number[] => {
  const { rate } = recording.shaping;

  return recording.timeline.flatMap((segment) => {
    if (segment.held || rate <= 0) {
      return [];
    }

    const trackEndMs = segmentTrackEndMs(segment, rate);

    return trackMs >= segment.trackStartMs && trackMs < trackEndMs
      ? [segment.recordingStartMs + (trackMs - segment.trackStartMs) / rate]
      : [];
  });
};

/** First to last track position the recording covers, or `null` when it never advanced. */
export const getRecordedTrackRange = (
  recording: TimelineRecording,
): TrackRange | null => {
  const { rate } = recording.shaping;
  const moving = recording.timeline.filter((segment) => !segment.held);

  if (moving.length === 0) {
    return null;
  }

  return {
    startMs: Math.min(...moving.map((segment) => segment.trackStartMs)),
    endMs: Math.max(
      ...moving.map((segment) => segmentTrackEndMs(segment, rate)),
    ),
  };
};

/** Whether the recording runs from near the track's start to near its end. */
export const isWholeTrackRecording = (
  recording: TimelineRecording & Pick<Recording, 'source'>,
): boolean => {
  const range = getRecordedTrackRange(recording);
  const { durationMs } = recording.source;

  if (!range || durationMs === undefined) {
    return false;
  }

  return (
    range.startMs <= WHOLE_TRACK_EDGE_TOLERANCE_MS &&
    range.endMs >= durationMs - WHOLE_TRACK_EDGE_TOLERANCE_MS
  );
};

/** How many times the recording passed over a track position (loop passes). */
export const countRecordedPasses = (
  recording: TimelineRecording,
  trackMs: number,
): number => getRecordingTimesAtTrackPosition(recording, trackMs).length;
