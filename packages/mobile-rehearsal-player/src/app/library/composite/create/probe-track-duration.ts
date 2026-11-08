import type { DriveAudioSource } from '@org/audio-library-models';

/** Composites play on the web only for now, so there is nothing to probe elsewhere. */
export const probeTrackDurationMs = async (
  source: DriveAudioSource,
  accessToken: string | null,
): Promise<number | null> => {
  void source;
  void accessToken;

  return null;
};
