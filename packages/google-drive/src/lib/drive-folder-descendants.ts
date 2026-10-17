import {
  createFolderDescendantQuery,
  FOLDER_SCOPE_BATCH_SIZE,
  splitIntoBatches,
} from './drive-file-queries';
import { isDriveFolder } from './drive-discovery-models';
import { requestAllDriveFilesWithFallback } from './drive-files-client';

/**
 * Every folder under `rootFolderId`, the root included, found a level at a
 * time. A search inside a folder reads this to cover its subfolders too.
 */
export const listDescendantFolderIds = async (options: {
  accessToken: string;
  rootFolderId: string;
  signal?: AbortSignal;
}) => {
  const discoveredFolderIds = new Set<string>([options.rootFolderId]);
  let frontier = [options.rootFolderId];

  while (frontier.length > 0) {
    const nextFrontier: string[] = [];

    for (const batch of splitIntoBatches(frontier, FOLDER_SCOPE_BATCH_SIZE)) {
      const files = await requestAllDriveFilesWithFallback({
        accessToken: options.accessToken,
        query: createFolderDescendantQuery(batch),
        includeSharedDrives: true,
        signal: options.signal,
      });

      for (const file of files) {
        if (!isDriveFolder(file) || discoveredFolderIds.has(file.id)) {
          continue;
        }

        discoveredFolderIds.add(file.id);
        nextFrontier.push(file.id);
      }
    }

    frontier = nextFrontier;
  }

  return [...discoveredFolderIds];
};

const DEFAULT_WALK_CONCURRENCY = 4;

export type FolderTreeWalkResult = {
  /** True when a folder listing failed, so some subfolders were never visited. */
  isIncomplete: boolean;
};

/**
 * Walks the folders under `rootFolderId` a level at a time, a few batches of
 * folders at once. `visit` is called with each batch of up to 20 folders (the
 * root first) while the walk lists those folders' subfolders in parallel, so
 * a caller can search a batch without waiting for the whole tree. A failure
 * to list subfolders ends the walk early and is reported, not thrown; a
 * failure in `visit` is thrown. `shouldStop` ends the walk between batches.
 */
export const walkFolderTree = async (options: {
  accessToken: string;
  concurrency?: number;
  rootFolderId: string;
  shouldStop?: () => boolean;
  signal?: AbortSignal;
  visit: (folderIds: string[]) => Promise<void>;
}): Promise<FolderTreeWalkResult> => {
  const { concurrency = DEFAULT_WALK_CONCURRENCY, shouldStop } = options;
  const seen = new Set<string>([options.rootFolderId]);
  let frontier = [options.rootFolderId];
  let isIncomplete = false;

  while (frontier.length > 0 && !shouldStop?.()) {
    const nextFrontier: string[] = [];
    const batches = splitIntoBatches(frontier, FOLDER_SCOPE_BATCH_SIZE);
    let nextBatch = 0;

    const worker = async () => {
      while (nextBatch < batches.length && !shouldStop?.()) {
        const batch = batches[nextBatch];

        nextBatch += 1;

        if (!batch) {
          return;
        }

        const [visited, listed] = await Promise.allSettled([
          options.visit(batch),
          requestAllDriveFilesWithFallback({
            accessToken: options.accessToken,
            includeSharedDrives: true,
            query: createFolderDescendantQuery(batch),
            signal: options.signal,
          }),
        ]);

        if (visited.status === 'rejected') {
          throw visited.reason;
        }

        if (listed.status === 'rejected') {
          if (options.signal?.aborted) {
            throw listed.reason;
          }

          isIncomplete = true;
          continue;
        }

        for (const file of listed.value) {
          if (isDriveFolder(file) && !seen.has(file.id)) {
            seen.add(file.id);
            nextFrontier.push(file.id);
          }
        }
      }
    };

    await Promise.all(
      Array.from({ length: Math.min(concurrency, batches.length) }, worker),
    );
    frontier = nextFrontier;
  }

  return { isIncomplete };
};
