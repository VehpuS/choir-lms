import {
  describeBundleFailure,
  type BundleCancelled,
  type BundleFailure,
  type BundleProgress,
  type BundleServiceDependencies,
} from './bundle-service-types';
import { buildAndWriteBundle } from './bundle-write';

export type BackupResult =
  | { status: 'ok'; fileId: string; fileName: string; removedBackups: number }
  | BundleFailure
  | BundleCancelled;

/**
 * Writes a dated backup of the whole library to `Choir LMS/Backups` and then
 * prunes older ones to the limit. Nothing is pruned unless the write
 * succeeded, so a failed backup never costs an earlier one.
 */
export const backUpLibrary = async (
  deps: BundleServiceDependencies,
  options: {
    selectedRecordingIds?: ReadonlySet<string>;
    signal?: AbortSignal;
    onProgress?: BundleProgress;
    /** Backup files that must survive pruning, such as an uncommitted pre-restore backup. */
    protectedIds?: ReadonlySet<string>;
  } = {},
): Promise<BackupResult> => {
  options.onProgress?.('folders');

  const folders = await deps.drive.ensureFolders(options.signal);

  if (folders.status === 'aborted') {
    return { status: 'cancelled' };
  }

  if (folders.status === 'failed') {
    return describeBundleFailure(folders.reason);
  }

  const written = await buildAndWriteBundle(deps, {
    scope: { kind: 'library' },
    selectedRecordingIds: options.selectedRecordingIds ?? new Set(),
    folder: folders.folders.backups,
    kind: 'backup',
    signal: options.signal,
    onProgress: options.onProgress,
  });

  if (written.status !== 'ok') {
    return written;
  }

  options.onProgress?.('pruning');

  const pruned = await deps.drive.prune({
    backupsFolderId: folders.folders.backups.id,
    protectedIds: new Set([...(options.protectedIds ?? []), written.fileId]),
    signal: options.signal,
  });

  return {
    status: 'ok',
    fileId: written.fileId,
    fileName: written.fileName,
    // Pruning is housekeeping: the backup is already saved if it fails.
    removedBackups: pruned.status === 'ok' ? pruned.removedIds.length : 0,
  };
};
