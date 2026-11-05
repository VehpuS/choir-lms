import { formatRecordingSize, type Recording } from '@org/audio-library-models';

/**
 * What a mix will cost, for the export dialog (task 14.11). A mix is 16-bit
 * stereo at the track's rate; 44.1 kHz is assumed, which is what the tracks in
 * the library nearly always are. Rendering was measured at about 66 times real
 * time on a laptop (design Spike results); a phone is slower, so the estimate
 * assumes 20 times and says `about`.
 */
const ASSUMED_SAMPLE_RATE = 44_100;
const BYTES_PER_FRAME = 4;
const ASSUMED_RENDER_SPEED = 20;
const MS_PER_SECOND = 1000;
const SECONDS_PER_MINUTE = 60;

export const getMixEstimate = (
  recordings: readonly Pick<Recording, 'durationMs'>[],
): { sizeBytes: number; renderSeconds: number } => {
  const seconds =
    recordings.reduce((sum, recording) => sum + recording.durationMs, 0) /
    MS_PER_SECOND;

  return {
    renderSeconds: Math.max(1, Math.ceil(seconds / ASSUMED_RENDER_SPEED)),
    sizeBytes: Math.round(seconds * ASSUMED_SAMPLE_RATE * BYTES_PER_FRAME),
  };
};

const formatRenderTime = (seconds: number): string =>
  seconds < SECONDS_PER_MINUTE
    ? `${seconds} s`
    : `${Math.ceil(seconds / SECONDS_PER_MINUTE)} min`;

/** `About 5.1 MB, ready in about 3 s.` */
export const describeMixEstimate = (
  recordings: readonly Pick<Recording, 'durationMs'>[],
): string => {
  const { renderSeconds, sizeBytes } = getMixEstimate(recordings);

  return `About ${formatRecordingSize(sizeBytes)}, ready in about ${formatRenderTime(renderSeconds)}.`;
};
