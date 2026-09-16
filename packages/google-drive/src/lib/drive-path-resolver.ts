import type { DriveBrowseRootKind } from './drive-discovery-models';
import { requestDriveFileMetadataWithFallback } from './drive-files-client';
import type { DriveFileMetadata } from './google-drive-core';

const DEFAULT_PATH_RESOLUTION_CONCURRENCY = 4;
const MY_DRIVE_ROOT_ID = 'root';
const INACCESSIBLE_DRIVE_ITEM_STATUS_PATTERN = /\b(?:403|404)\b/;

export type DrivePathSegment = {
  id: string;
  name: string;
};

export type DriveResolvedPath = {
  rootKind: DriveBrowseRootKind;
  path: DrivePathSegment[];
};

type DrivePathInput = Pick<DriveFileMetadata, 'id' | 'parents' | 'shared'>;

type DrivePathResolutionCache = Map<
  string,
  Promise<DriveFileMetadata | undefined>
>;

export const createDrivePathResolutionCache = (): DrivePathResolutionCache => {
  return new Map();
};

const throwIfAborted = (signal?: AbortSignal) => {
  if (!signal?.aborted) {
    return;
  }

  const abortError = new Error('Drive path resolution was aborted.');
  abortError.name = 'AbortError';
  throw abortError;
};

const isInaccessibleDriveItemError = (error: unknown) => {
  return (
    error instanceof Error &&
    INACCESSIBLE_DRIVE_ITEM_STATUS_PATTERN.test(error.message)
  );
};

const resolveConcurrency = (requestedConcurrency?: number) => {
  if (
    requestedConcurrency === undefined ||
    !Number.isFinite(requestedConcurrency)
  ) {
    return DEFAULT_PATH_RESOLUTION_CONCURRENCY;
  }

  return Math.max(1, Math.floor(requestedConcurrency));
};

export const resolveDriveFilePaths = async (options: {
  accessToken: string;
  files: DrivePathInput[];
  cache?: DrivePathResolutionCache;
  concurrency?: number;
  signal?: AbortSignal;
}) => {
  const metadataById = options.cache ?? createDrivePathResolutionCache();

  const getFolderMetadata = (driveFileId: string) => {
    const cachedMetadata = metadataById.get(driveFileId);

    if (cachedMetadata) {
      return cachedMetadata;
    }

    const metadata = (async () => {
      throwIfAborted(options.signal);

      try {
        const response = await requestDriveFileMetadataWithFallback({
          accessToken: options.accessToken,
          driveFileId,
          signal: options.signal,
        });

        return (await response.json()) as DriveFileMetadata;
      } catch (error) {
        if (isInaccessibleDriveItemError(error)) {
          return undefined;
        }

        throw error;
      }
    })();

    metadataById.set(driveFileId, metadata);
    return metadata;
  };

  const resolvePath = async (
    file: DrivePathInput,
  ): Promise<DriveResolvedPath> => {
    const pathFromFileToRoot: DrivePathSegment[] = [];
    const visitedIds = new Set<string>([file.id]);
    let parentIds = file.parents ?? [];
    let rootKind: DriveBrowseRootKind = file.shared ? 'shared' : 'my-drive';

    while (parentIds.length > 0) {
      throwIfAborted(options.signal);

      let accessibleParent: DriveFileMetadata | undefined;

      for (const parentId of parentIds) {
        if (visitedIds.has(parentId)) {
          continue;
        }

        if (parentId === MY_DRIVE_ROOT_ID) {
          rootKind = 'my-drive';
          parentIds = [];
          break;
        }

        const parent = await getFolderMetadata(parentId);

        if (parent) {
          accessibleParent = parent;
          break;
        }
      }

      if (!accessibleParent) {
        break;
      }

      if (
        !accessibleParent.shared &&
        (accessibleParent.parents?.length ?? 0) === 0
      ) {
        rootKind = 'my-drive';
        break;
      }

      visitedIds.add(accessibleParent.id);
      pathFromFileToRoot.push({
        id: accessibleParent.id,
        name: accessibleParent.name,
      });
      rootKind = accessibleParent.shared ? 'shared' : rootKind;
      parentIds = accessibleParent.parents ?? [];
    }

    return {
      rootKind,
      path: pathFromFileToRoot.reverse(),
    };
  };

  const resolvedPaths: Array<DriveResolvedPath | undefined> = new Array(
    options.files.length,
  );
  let nextFileIndex = 0;
  const workerCount = Math.min(
    resolveConcurrency(options.concurrency),
    options.files.length,
  );

  const workers = Array.from({ length: workerCount }, async () => {
    while (nextFileIndex < options.files.length) {
      const fileIndex = nextFileIndex;
      nextFileIndex += 1;
      const file = options.files[fileIndex];

      if (!file) {
        continue;
      }

      resolvedPaths[fileIndex] = await resolvePath(file);
    }
  });

  await Promise.all(workers);

  return new Map(
    options.files.flatMap((file, index) => {
      const resolvedPath = resolvedPaths[index];

      return resolvedPath ? [[file.id, resolvedPath] as const] : [];
    }),
  );
};
