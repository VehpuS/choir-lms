import type { Recording } from '@org/audio-library-models';

export type RecordingOverlayHandle = { dispose: () => void };

/** Native cannot record or play recordings yet (see `recordingCapabilities`); the web file does. */
export const startRecordingOverlay: (
  recording: Recording,
) => Promise<RecordingOverlayHandle | null> = async () => null;
