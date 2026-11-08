import type { DriveAudioSource } from '@org/audio-library-models';

import { fetchTrackBlob } from '../playback/create-composite-engine-loader';

const METADATA_EVENT = 'loadedmetadata';
const ERROR_EVENT = 'error';

type MetadataElement = {
  duration: number;
  src: string;
  preload: string;
  addEventListener: (event: string, listener: () => void) => void;
};

/**
 * A track's length, read from its audio on this device without touching the
 * player (a player probe would stop what is playing). The bytes come through
 * the normal download path, so they are cached for the preparation that
 * follows. Null when the file cannot be fetched or read.
 */
export const probeTrackDurationMs = async (
  source: DriveAudioSource,
  accessToken: string | null,
): Promise<number | null> => {
  const AudioCtor = (globalThis as { Audio?: new () => MetadataElement }).Audio;

  if (!AudioCtor) {
    return null;
  }

  try {
    const blob = await fetchTrackBlob(source, accessToken);
    const url = URL.createObjectURL(blob);

    try {
      const element = new AudioCtor();

      element.preload = 'metadata';

      const loaded = new Promise<number | null>((resolve) => {
        element.addEventListener(METADATA_EVENT, () => {
          resolve(
            Number.isFinite(element.duration) && element.duration > 0
              ? Math.round(element.duration * 1000)
              : null,
          );
        });
        element.addEventListener(ERROR_EVENT, () => resolve(null));
      });

      element.src = url;

      return await loaded;
    } finally {
      URL.revokeObjectURL(url);
    }
  } catch {
    return null;
  }
};
