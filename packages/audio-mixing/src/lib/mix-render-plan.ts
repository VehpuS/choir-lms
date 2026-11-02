import type { Recording } from '@org/audio-library-models';

/**
 * Turns a recording's metadata into the frames an offline mix has to produce
 * (rehearsal-recording design Decision 12). The plan is a pure function of the
 * metadata and the output sample rate: no session, cache or clock.
 */

const MS_PER_SECOND = 1000;

export type MixPlanSegment = {
  /** First output frame of the segment. */
  startFrame: number;
  /** One past the last output frame of the segment. */
  endFrame: number;
  /** `silence` while the track was paused or no playback was recorded. */
  kind: 'silence' | 'track';
  /** Track position at `startFrame`, in original-audio milliseconds. */
  trackStartMs: number;
  /** Track seconds covered per second of output. */
  rate: number;
  pitchSemitones: number;
};

export type MixRenderPlan = {
  totalFrames: number;
  segments: MixPlanSegment[];
  /** Frames the recording is placed later (positive) or earlier (negative). */
  recordingOffsetFrames: number;
};

type PlannedRecording = Pick<
  Recording,
  'durationMs' | 'nudgeMs' | 'shaping' | 'timeline'
>;

const msToFrames = (ms: number, sampleRate: number): number =>
  Math.round((ms * sampleRate) / MS_PER_SECOND);

const silence = (
  startFrame: number,
  endFrame: number,
  shaping: PlannedRecording['shaping'],
): MixPlanSegment => ({
  endFrame,
  kind: 'silence',
  pitchSemitones: shaping.pitchSemitones,
  rate: shaping.rate,
  startFrame,
  trackStartMs: 0,
});

/**
 * The compensation applied while recording is already inside the timeline's
 * bounds, so only the nudge (a positive nudge plays the recording later)
 * moves the recording against the track.
 */
export const planMixRender = (
  recording: PlannedRecording,
  outputSampleRate: number,
): MixRenderPlan => {
  const totalFrames = msToFrames(recording.durationMs, outputSampleRate);
  const { shaping } = recording;
  const ordered = [...recording.timeline].sort(
    (first, second) => first.recordingStartMs - second.recordingStartMs,
  );
  const segments: MixPlanSegment[] = [];
  let cursor = 0;

  for (const segment of ordered) {
    const rawStart = msToFrames(segment.recordingStartMs, outputSampleRate);
    const startFrame = Math.max(cursor, Math.min(totalFrames, rawStart));
    const endFrame = Math.min(
      totalFrames,
      msToFrames(segment.recordingEndMs, outputSampleRate),
    );

    if (endFrame <= startFrame) {
      continue;
    }

    if (startFrame > cursor) {
      segments.push(silence(cursor, startFrame, shaping));
    }

    // A segment that had to start later than recorded (overlap) keeps its
    // track position in step with the output.
    const skippedMs =
      ((startFrame - rawStart) * MS_PER_SECOND) / outputSampleRate;

    segments.push(
      segment.held
        ? silence(startFrame, endFrame, shaping)
        : {
            endFrame,
            kind: 'track',
            pitchSemitones: shaping.pitchSemitones,
            rate: shaping.rate,
            startFrame,
            trackStartMs: segment.trackStartMs + skippedMs * shaping.rate,
          },
    );
    cursor = endFrame;
  }

  if (cursor < totalFrames) {
    segments.push(silence(cursor, totalFrames, shaping));
  }

  return {
    recordingOffsetFrames: msToFrames(recording.nudgeMs, outputSampleRate),
    segments,
    totalFrames,
  };
};
