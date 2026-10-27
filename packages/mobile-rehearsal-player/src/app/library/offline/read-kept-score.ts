import { persistentAudioCache } from '../playback/audio-cache';
import { SCORE_SOURCE_VERSION } from './offline-keeping';

/** The bytes of a score kept offline, or null when it is not stored. */
export const readKeptScore = async (
  fileId: string,
): Promise<Uint8Array | null> => {
  const blob = await persistentAudioCache.read(fileId, SCORE_SOURCE_VERSION);

  return blob ? new Uint8Array(await blob.arrayBuffer()) : null;
};
