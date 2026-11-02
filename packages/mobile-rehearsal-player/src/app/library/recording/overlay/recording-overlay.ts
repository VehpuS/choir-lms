import type { Recording } from '@org/audio-library-models';

/** The range the loop repeats over, when the recording is of a loop playing in it. */
export type RecordingOverlayOptions = {
  loopRange?: { startMs: number; endMs: number };
};

export type RecordingOverlayHandle = {
  dispose: () => void;
  /** The recording's own level, 0 to 1 (balance times the playback volume). */
  setLevel: (level: number) => void;
  /** Moves the recording against the track at once; positive plays it later. */
  setNudgeMs: (nudgeMs: number) => void;
};

/** Native cannot record or play recordings yet (see `recordingCapabilities`); the web file does. */
export const startRecordingOverlay: (
  recording: Recording,
  options?: RecordingOverlayOptions,
) => Promise<RecordingOverlayHandle | null> = async () => null;
