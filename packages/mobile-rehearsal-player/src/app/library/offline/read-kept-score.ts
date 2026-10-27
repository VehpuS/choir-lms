import { persistentAudioCache } from '../playback/audio-cache';
import { fetchScoreVersion } from './score-version';

const findKeptScore = async (fileId: string) => {
  return (await persistentAudioCache.list()).find((entry) => {
    return entry.driveFileId === fileId && entry.kind === 'score';
  });
};

/** The bytes of a score kept offline, or null when it is not stored. */
export const readKeptScore = async (
  fileId: string,
): Promise<Uint8Array | null> => {
  const entry = await findKeptScore(fileId);
  const blob = entry
    ? await persistentAudioCache.read(fileId, entry.sourceVersion)
    : null;

  return blob ? new Uint8Array(await blob.arrayBuffer()) : null;
};

/**
 * A kept score that was just downloaded fresh replaces its stored copy, so
 * the copy used offline follows edits made in Drive. Its owners and kept state
 * stay. Only scores already kept are touched; failures change nothing.
 */
export const refreshKeptScore = async (
  fileId: string,
  bytes: Uint8Array,
  accessToken: string | undefined,
): Promise<void> => {
  try {
    const entry = await findKeptScore(fileId);

    if (!entry) {
      return;
    }

    const version = accessToken
      ? ((await fetchScoreVersion(fileId, accessToken)) ?? entry.sourceVersion)
      : entry.sourceVersion;

    // Same bytes at the same version: nothing to rewrite.
    if (
      version === entry.sourceVersion &&
      bytes.byteLength === entry.sizeBytes
    ) {
      return;
    }

    await persistentAudioCache.write(
      fileId,
      version,
      new Blob([bytes as unknown as Blob]),
    );
  } catch {
    // The stored copy stays as it was.
  }
};
