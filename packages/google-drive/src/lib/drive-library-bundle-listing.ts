import {
  mapUploadFailure,
  isAbort,
  type DriveUploadFailureReason,
} from './drive-file-upload';
import {
  BUNDLE_COUNTS_PROPERTY_KEY,
  BUNDLE_PROPERTY_KEY,
  BUNDLE_PROPERTY_VALUE,
  DRIVE_FILES_ENDPOINT,
  JSON_MIME_TYPE,
  type BundleRequestOptions,
  type DriveBundleFetch,
  type LibraryBundleCounts,
} from './drive-library-bundle-files';
import {
  getBundleFileKind,
  type LibraryBundleFileKind,
} from './drive-library-bundle-folders';

const LIST_FIELDS =
  'files(id,name,modifiedTime,size,owners(displayName,emailAddress),appProperties)';
const LIST_PAGE_SIZE = '100';

export type DriveBundleListing = {
  id: string;
  name: string;
  modifiedTime?: string;
  sizeBytes?: number;
  owner?: { name?: string; email?: string };
  /** In the user's own bundle folders, or shared with them by someone else. */
  origin: 'mine' | 'shared';
  kind: LibraryBundleFileKind | 'unknown';
  /** Counts the writer stored on the file, when present. */
  counts?: LibraryBundleCounts;
  /** Carries the app's property; false for a file found only by its name. */
  marked: boolean;
};

export type ListLibraryBundlesResult =
  | { status: 'ok'; bundles: DriveBundleListing[] }
  | { status: 'aborted' }
  | { status: 'failed'; reason: DriveUploadFailureReason };

type RawFile = {
  id?: unknown;
  name?: unknown;
  modifiedTime?: unknown;
  size?: unknown;
  owners?: Array<{ displayName?: unknown; emailAddress?: unknown }>;
  appProperties?: Record<string, unknown>;
};

export const MARKED_QUERY = `appProperties has { key='${BUNDLE_PROPERTY_KEY}' and value='${BUNDLE_PROPERTY_VALUE}' }`;
// Fallback for a copy or download that dropped the property: the names the app writes.
const NAME_FALLBACK_QUERY = `(name contains 'choir-lms-' and mimeType = '${JSON_MIME_TYPE}')`;

const parseCounts = (value: unknown): LibraryBundleCounts | undefined => {
  const parts = typeof value === 'string' ? value.split(',').map(Number) : [];
  const [tracks, loops, playlists] = parts;

  return parts.length === 3 &&
    parts.every((part) => Number.isInteger(part) && part >= 0)
    ? {
        tracks: tracks as number,
        loops: loops as number,
        playlists: playlists as number,
      }
    : undefined;
};

export const toListing = (
  file: RawFile,
  origin: DriveBundleListing['origin'],
): DriveBundleListing | null => {
  if (typeof file.id !== 'string' || typeof file.name !== 'string') {
    return null;
  }

  const marked =
    file.appProperties?.[BUNDLE_PROPERTY_KEY] === BUNDLE_PROPERTY_VALUE;
  const kind = getBundleFileKind(file.name);

  // A name-only match must really look like one of ours.
  if (!marked && kind === null) {
    return null;
  }

  const counts = parseCounts(file.appProperties?.[BUNDLE_COUNTS_PROPERTY_KEY]);
  const [owner] = file.owners ?? [];
  const ownerName =
    typeof owner?.displayName === 'string' ? owner.displayName : undefined;
  const ownerEmail =
    typeof owner?.emailAddress === 'string' ? owner.emailAddress : undefined;
  const sizeBytes =
    typeof file.size === 'string' ? Number(file.size) : undefined;

  return {
    id: file.id,
    name: file.name,
    ...(typeof file.modifiedTime === 'string'
      ? { modifiedTime: file.modifiedTime }
      : {}),
    ...(sizeBytes !== undefined && Number.isFinite(sizeBytes)
      ? { sizeBytes }
      : {}),
    ...(ownerName || ownerEmail
      ? {
          owner: {
            ...(ownerName ? { name: ownerName } : {}),
            ...(ownerEmail ? { email: ownerEmail } : {}),
          },
        }
      : {}),
    ...(counts ? { counts } : {}),
    origin,
    kind: kind ?? 'unknown',
    marked,
  };
};

export const listFiles = async (
  query: string,
  options: BundleRequestOptions,
): Promise<
  | { ok: true; files: RawFile[] }
  | {
      ok: false;
      result:
        | { status: 'aborted' }
        | { status: 'failed'; reason: DriveUploadFailureReason };
    }
> => {
  const send =
    options.fetch ?? (globalThis.fetch as unknown as DriveBundleFetch);

  try {
    const response = await send(
      `${DRIVE_FILES_ENDPOINT}?${new URLSearchParams({
        fields: LIST_FIELDS,
        includeItemsFromAllDrives: 'true',
        orderBy: 'modifiedTime desc',
        pageSize: LIST_PAGE_SIZE,
        q: query,
        supportsAllDrives: 'true',
      }).toString()}`,
      {
        headers: { Authorization: `Bearer ${options.accessToken}` },
        method: 'GET',
        signal: options.signal,
      },
    );

    if (!response.ok) {
      return {
        ok: false,
        result: { status: 'failed', reason: await mapUploadFailure(response) },
      };
    }

    return {
      ok: true,
      files: ((await response.json()) as { files?: RawFile[] }).files ?? [],
    };
  } catch (error) {
    return {
      ok: false,
      result: isAbort(error, options.signal)
        ? { status: 'aborted' }
        : {
            status: 'failed',
            reason: error instanceof TypeError ? 'offline' : 'unavailable',
          },
    };
  }
};

/**
 * Bundles the user can open: those they own (found without needing the
 * folders to exist, so listing works with read-only access), or, when
 * `folderIds` is given, those in exactly those folders, plus those shared
 * with them. A file is recognised by the app's
 * property or, if a copy dropped it, by the names the app writes.
 */
export const listLibraryBundles = async (
  options: BundleRequestOptions & { folderIds?: readonly string[] },
): Promise<ListLibraryBundlesResult> => {
  const marker = `(${MARKED_QUERY} or ${NAME_FALLBACK_QUERY})`;
  const parents = (options.folderIds ?? [])
    .map((id) => `'${id}' in parents`)
    .join(' or ');
  const ownQuery = options.folderIds
    ? parents && `trashed = false and (${parents}) and ${marker}`
    : `trashed = false and 'me' in owners and ${marker}`;
  const searches: Array<[string, DriveBundleListing['origin']]> = [
    ...(ownQuery ? [[ownQuery, 'mine'] as [string, 'mine']] : []),
    [`trashed = false and sharedWithMe and ${marker}`, 'shared'],
  ];
  const byId = new Map<string, DriveBundleListing>();

  for (const [query, origin] of searches) {
    const listed = await listFiles(query, options);

    if (!listed.ok) {
      return listed.result;
    }

    for (const file of listed.files) {
      const listing = toListing(file, origin);

      // A file in the user's own folders is theirs even if it also appears as shared.
      if (listing && !byId.has(listing.id)) {
        byId.set(listing.id, listing);
      }
    }
  }

  return {
    status: 'ok',
    bundles: [...byId.values()].sort((a, b) =>
      (b.modifiedTime ?? '').localeCompare(a.modifiedTime ?? ''),
    ),
  };
};

export type ReadLibraryBundleResult =
  | { status: 'ok'; text: string }
  | { status: 'aborted' }
  | { status: 'failed'; reason: DriveUploadFailureReason };

/** Reads a bundle's text; reading needs only the read-only scope. */
export const readLibraryBundleText = async (
  options: BundleRequestOptions & { fileId: string },
): Promise<ReadLibraryBundleResult> => {
  const send =
    options.fetch ?? (globalThis.fetch as unknown as DriveBundleFetch);

  try {
    const response = await send(
      `${DRIVE_FILES_ENDPOINT}/${encodeURIComponent(options.fileId)}?alt=media&supportsAllDrives=true`,
      {
        headers: { Authorization: `Bearer ${options.accessToken}` },
        method: 'GET',
        signal: options.signal,
      },
    );

    return response.ok
      ? { status: 'ok', text: await response.text() }
      : { status: 'failed', reason: await mapUploadFailure(response) };
  } catch (error) {
    return isAbort(error, options.signal)
      ? { status: 'aborted' }
      : {
          status: 'failed',
          reason: error instanceof TypeError ? 'offline' : 'unavailable',
        };
  }
};
