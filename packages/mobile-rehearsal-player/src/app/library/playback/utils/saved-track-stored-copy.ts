import { isDeviceOffline } from '../../offline/device-connection';
import {
  persistentAudioCache,
  type PersistentAudioCache,
} from '../audio-cache';
import {
  savedTrackAudioCache,
  type SavedTrackAudioCache,
} from './saved-track-audio-cache';
import { parseDriveFileId } from './saved-track-web-download';
import { StoredCopyUnavailableError } from './stored-copy-unavailable-error';

type StoredCopyDependencies = {
  cache?: SavedTrackAudioCache;
  isOffline?: () => boolean;
  persistence?: Pick<PersistentAudioCache, 'read'>;
};

/**
 * The bytes of a file from this device alone, without Drive: the in-memory
 * copy first, then the stored one, at the version the library knows. Throws
 * `StoredCopyUnavailableError` when neither has it.
 */
export const readStoredSavedTrackBlob = async (
  request: { url: string; version?: string },
  {
    cache = savedTrackAudioCache,
    isOffline = isDeviceOffline,
    persistence = persistentAudioCache,
  }: StoredCopyDependencies = {},
): Promise<Blob> => {
  const driveFileId = parseDriveFileId(request.url);

  if (driveFileId !== null && request.version !== undefined) {
    const memoryBlob = cache.get(driveFileId, request.version);

    if (memoryBlob) {
      return memoryBlob;
    }

    const storedBlob = await persistence.read(driveFileId, request.version);

    if (storedBlob) {
      cache.set(driveFileId, request.version, storedBlob);

      return storedBlob;
    }
  }

  throw new StoredCopyUnavailableError(isOffline());
};
