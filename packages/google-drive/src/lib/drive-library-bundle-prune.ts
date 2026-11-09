import { mapUploadFailure, isAbort } from './drive-file-upload';
import {
  DRIVE_FILES_ENDPOINT,
  type BundleRequestOptions,
  type DriveBundleFetch,
} from './drive-library-bundle-files';
import {
  listFiles,
  MARKED_QUERY,
  toListing,
} from './drive-library-bundle-listing';
import type { DriveUploadFailureReason } from './drive-file-upload';

export const DEFAULT_BACKUP_RETENTION = 5;

export type PruneBackupsResult =
  | { status: 'ok'; removedIds: string[] }
  | { status: 'aborted' }
  | { status: 'failed'; reason: DriveUploadFailureReason };

/**
 * Keeps the newest `keep` files of each backup kind in `Backups` and moves the
 * rest to the trash (recoverable, never a permanent delete). Only files the
 * app wrote (marked and named like its own) are touched, and `protectedIds`,
 * such as a pre-restore backup whose restore has not committed, never are.
 * Run it only after a successful write.
 */
export const pruneLibraryBackups = async (
  options: BundleRequestOptions & {
    backupsFolderId: string;
    keep?: number;
    protectedIds?: ReadonlySet<string>;
  },
): Promise<PruneBackupsResult> => {
  const keep = options.keep ?? DEFAULT_BACKUP_RETENTION;
  const listed = await listFiles(
    `trashed = false and '${options.backupsFolderId}' in parents and ${MARKED_QUERY}`,
    options,
  );

  if (!listed.ok) {
    return listed.result;
  }

  const send =
    options.fetch ?? (globalThis.fetch as unknown as DriveBundleFetch);
  const ours = listed.files
    .flatMap((file) => toListing(file, 'mine') ?? [])
    .filter(
      (file) =>
        file.marked && (file.kind === 'backup' || file.kind === 'pre-restore'),
    );
  const removable = (['backup', 'pre-restore'] as const).flatMap((kind) =>
    ours
      .filter((file) => file.kind === kind)
      .sort((a, b) =>
        (b.modifiedTime ?? '').localeCompare(a.modifiedTime ?? ''),
      )
      .slice(keep)
      .filter((file) => !options.protectedIds?.has(file.id)),
  );
  const removedIds: string[] = [];

  try {
    for (const file of removable) {
      const response = await send(
        `${DRIVE_FILES_ENDPOINT}/${encodeURIComponent(file.id)}?supportsAllDrives=true`,
        {
          body: JSON.stringify({ trashed: true }),
          headers: {
            Authorization: `Bearer ${options.accessToken}`,
            'Content-Type': 'application/json',
          },
          method: 'PATCH',
          signal: options.signal,
        },
      );

      if (!response.ok) {
        return { status: 'failed', reason: await mapUploadFailure(response) };
      }

      removedIds.push(file.id);
    }
  } catch (error) {
    return isAbort(error, options.signal)
      ? { status: 'aborted' }
      : {
          status: 'failed',
          reason: error instanceof TypeError ? 'offline' : 'unavailable',
        };
  }

  return { status: 'ok', removedIds };
};
