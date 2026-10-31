import type { RecordingTimelineSegment } from '@org/audio-library-models';

/**
 * Turns the track events seen during a recording into the stored timeline
 * (rehearsal-recording design Decisions 2, 3 and 9).
 */

/** The track's state from `atMs` on, on the recording clock (0 at the first sample). */
export type TrackStateChange = {
  atMs: number;
  /** Track position at that moment, in original-audio milliseconds. */
  trackMs: number;
  playing: boolean;
};

export type BuildTimelineOptions = {
  /** At least the opening state, at 0. Later entries are pauses, resumes, seeks, wraps. */
  changes: readonly TrackStateChange[];
  /** Track seconds per recording second, fixed for the recording. */
  rate: number;
  /** Output plus input latency: a track event is sung against this much later. */
  latencyMs: number;
  durationMs: number;
};

/**
 * Compensation shifts every change later by the latency, since the singer
 * reacts to a sound that left the speaker earlier, and the first segment is
 * extended back to the first sample using the position the track had before.
 * Segments left empty by the shift or by the end of the recording are dropped.
 */
export const buildRecordingTimeline = (
  options: BuildTimelineOptions,
): RecordingTimelineSegment[] => {
  const { changes, rate, latencyMs, durationMs } = options;
  const ordered = [...changes].sort((a, b) => a.atMs - b.atMs);

  return ordered.flatMap((change, index) => {
    const isFirst = index === 0;
    const startMs = isFirst ? 0 : change.atMs + latencyMs;
    const next = ordered[index + 1];
    const endMs = Math.min(
      durationMs,
      next ? next.atMs + latencyMs : durationMs,
    );

    if (endMs <= startMs) {
      return [];
    }

    // The first sample answers a track position from `latencyMs` before start.
    const trackStartMs =
      isFirst && change.playing
        ? Math.max(0, change.trackMs - rate * latencyMs)
        : change.trackMs;

    return [
      {
        recordingStartMs: startMs,
        recordingEndMs: endMs,
        trackStartMs,
        held: !change.playing,
      },
    ];
  });
};
