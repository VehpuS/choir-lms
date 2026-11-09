import { isAbort } from './drive-file-upload';
import type { DriveBundleFetch } from './drive-library-bundle-files';

const DRIVE_FILES_ENDPOINT = 'https://www.googleapis.com/drive/v3/files';
const DEFAULT_PROBE_CONCURRENCY = 4;
const NOT_FOUND_STATUS = 404;
const FORBIDDEN_STATUS = 403;

/**
 * `needs-access` covers 404 and 403 alike: Drive answers 404 both for a file
 * that was deleted and for one never shared with the user, so the app cannot
 * tell them apart and must not claim a cause. `unknown` means the probe could
 * not decide (offline, sign-in expired), which is never shown as needing access.
 */
export type DriveFileAccess = 'accessible' | 'needs-access' | 'unknown';

type AccessOptions = {
  accessToken: string;
  fetch?: DriveBundleFetch;
  signal?: AbortSignal;
};

const authorization = (accessToken: string) => ({
  Authorization: `Bearer ${accessToken}`,
});

/** Runs `task` for every item with at most `limit` in flight, keeping order of results. */
const mapWithConcurrency = async <Item, Result>(
  items: readonly Item[],
  limit: number,
  task: (item: Item) => Promise<Result>,
): Promise<Result[]> => {
  const results = new Array<Result>(items.length);
  let next = 0;
  const worker = async () => {
    while (next < items.length) {
      const index = next;

      next += 1;
      results[index] = await task(items[index] as Item);
    }
  };

  await Promise.all(
    Array.from({ length: Math.min(limit, items.length) }, worker),
  );

  return results;
};

/** Asks Drive whether the user can open one file, with a metadata request. */
export const probeDriveFileAccess = async (
  options: AccessOptions & { fileId: string },
): Promise<DriveFileAccess> => {
  const send =
    options.fetch ?? (globalThis.fetch as unknown as DriveBundleFetch);

  try {
    const response = await send(
      `${DRIVE_FILES_ENDPOINT}/${encodeURIComponent(options.fileId)}?fields=id&supportsAllDrives=true`,
      {
        headers: authorization(options.accessToken),
        method: 'GET',
        signal: options.signal,
      },
    );

    if (response.ok) {
      return 'accessible';
    }

    return response.status === NOT_FOUND_STATUS ||
      response.status === FORBIDDEN_STATUS
      ? 'needs-access'
      : 'unknown';
  } catch {
    return 'unknown';
  }
};

export type DriveAccessProbeResult = {
  /** Access by Drive file id. */
  access: Map<string, DriveFileAccess>;
  /** True when the caller's signal stopped the run; unprobed ids are absent. */
  aborted: boolean;
};

/** Probes many files with bounded concurrency, stopping early on abort. */
export const probeDriveFilesAccess = async (
  options: AccessOptions & {
    fileIds: readonly string[];
    concurrency?: number;
  },
): Promise<DriveAccessProbeResult> => {
  const fileIds = [...new Set(options.fileIds)];
  const access = new Map<string, DriveFileAccess>();

  await mapWithConcurrency(
    fileIds,
    options.concurrency ?? DEFAULT_PROBE_CONCURRENCY,
    async (fileId) => {
      if (options.signal?.aborted) {
        return;
      }

      access.set(fileId, await probeDriveFileAccess({ ...options, fileId }));
    },
  );

  return { access, aborted: options.signal?.aborted === true };
};

export type DriveFileOwner = { name?: string; email?: string };

/**
 * Looks up the owner of each file for the export, best effort: a file the
 * user does not own may report none, and any failure just leaves that file
 * out so the bundle falls back to its author.
 */
export const lookupDriveFileOwners = async (
  options: AccessOptions & {
    fileIds: readonly string[];
    concurrency?: number;
  },
): Promise<Map<string, DriveFileOwner>> => {
  const send =
    options.fetch ?? (globalThis.fetch as unknown as DriveBundleFetch);
  const owners = new Map<string, DriveFileOwner>();

  await mapWithConcurrency(
    [...new Set(options.fileIds)],
    options.concurrency ?? DEFAULT_PROBE_CONCURRENCY,
    async (fileId) => {
      try {
        const response = await send(
          `${DRIVE_FILES_ENDPOINT}/${encodeURIComponent(fileId)}?fields=owners(displayName,emailAddress)&supportsAllDrives=true`,
          {
            headers: authorization(options.accessToken),
            method: 'GET',
            signal: options.signal,
          },
        );

        if (!response.ok) {
          return;
        }

        const [owner] =
          (
            (await response.json()) as {
              owners?: Array<{ displayName?: unknown; emailAddress?: unknown }>;
            }
          ).owners ?? [];
        const name =
          typeof owner?.displayName === 'string'
            ? owner.displayName
            : undefined;
        const email =
          typeof owner?.emailAddress === 'string'
            ? owner.emailAddress
            : undefined;

        if (name || email) {
          owners.set(fileId, {
            ...(name ? { name } : {}),
            ...(email ? { email } : {}),
          });
        }
      } catch (error) {
        if (isAbort(error, options.signal)) {
          return;
        }
      }
    },
  );

  return owners;
};
