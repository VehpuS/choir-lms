import type { DriveLibrarySource } from '../drive/utils/drive-library-view-model';
import type { KeepOfflineResult } from './offline-keeping';

/** Native keeps no offline audio yet (native-playback-follow-ups 1.10). */
export const isOfflineStorageSupported = false;

// The same signatures as `offline-actions.web.ts`.
export const keepSourceOffline: (
  source: DriveLibrarySource,
  accessToken: string,
) => Promise<KeepOfflineResult> = async () => {
  throw new Error('Offline storage is not available on this device yet.');
};

export const removeSourceOffline: (
  driveFileId: string,
) => Promise<void> = async () => undefined;
