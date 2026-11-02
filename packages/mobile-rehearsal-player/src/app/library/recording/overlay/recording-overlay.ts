import type { Recording } from '@org/audio-library-models';

export type RecordingOverlayHandle = {
  dispose: () => void;
  /** The recording's own level, 0 to 1 (balance times the playback volume). */
  setLevel: (level: number) => void;
};

/** Native cannot record or play recordings yet (see `recordingCapabilities`); the web file does. */
export const startRecordingOverlay: (
  recording: Recording,
) => Promise<RecordingOverlayHandle | null> = async () => null;
