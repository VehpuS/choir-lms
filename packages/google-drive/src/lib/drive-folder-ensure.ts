import {
  isAbort,
  mapUploadFailure,
  type DriveUploadFailureReason,
} from './drive-file-upload';

const DRIVE_FILES_ENDPOINT = 'https://www.googleapis.com/drive/v3/files';
const FOLDER_MIME_TYPE = 'application/vnd.google-apps.folder';
const MY_DRIVE_ROOT_ID = 'root';
const FOLDER_FIELDS = 'id,name';
const QUOTE_OR_BACKSLASH_PATTERN = /['\\]/g;

export type DriveFolderRef = { id: string; name: string };

export type EnsureDriveFolderResult =
  | { status: 'ready'; folder: DriveFolderRef; created: boolean }
  | { status: 'aborted' }
  | { status: 'failed'; reason: DriveUploadFailureReason };

type EnsureFetch = (
  input: string,
  init: {
    body?: string;
    headers: Record<string, string>;
    method: 'GET' | 'POST';
    signal?: AbortSignal;
  },
) => Promise<{ json(): Promise<unknown>; ok: boolean; status: number }>;

export type EnsureDriveFolderOptions = {
  accessToken: string;
  fetch?: EnsureFetch;
  /** Where to look and create; My Drive's root when absent. */
  parentId?: string;
  name: string;
  signal?: AbortSignal;
};

const isFolderRef = (value: unknown): value is DriveFolderRef => {
  const folder = value as Partial<DriveFolderRef> | undefined;

  return typeof folder?.id === 'string' && typeof folder.name === 'string';
};

/**
 * Finds a folder by name in a parent (My Drive by default) or creates it, so
 * a dedicated folder such as `Choir Recordings` exists without the user making
 * it. Needs the `drive.file` scope to create and a read scope to find a folder
 * made another way. Never throws: every outcome is a typed result.
 */
export const ensureDriveFolder = async (
  options: EnsureDriveFolderOptions,
): Promise<EnsureDriveFolderResult> => {
  const send = options.fetch ?? (globalThis.fetch as unknown as EnsureFetch);
  const parentId = options.parentId ?? MY_DRIVE_ROOT_ID;
  const headers = { Authorization: `Bearer ${options.accessToken}` };
  const escaped = options.name.replace(QUOTE_OR_BACKSLASH_PATTERN, '\\$&');
  const query = `name = '${escaped}' and mimeType = '${FOLDER_MIME_TYPE}' and '${parentId}' in parents and trashed = false`;

  try {
    const found = await send(
      `${DRIVE_FILES_ENDPOINT}?${new URLSearchParams({
        fields: `files(${FOLDER_FIELDS})`,
        includeItemsFromAllDrives: 'true',
        pageSize: '1',
        q: query,
        supportsAllDrives: 'true',
      }).toString()}`,
      { headers, method: 'GET', signal: options.signal },
    );

    if (!found.ok) {
      return { reason: await mapUploadFailure(found), status: 'failed' };
    }

    const [existing] =
      ((await found.json()) as { files?: unknown[] }).files ?? [];

    if (isFolderRef(existing)) {
      return { created: false, folder: existing, status: 'ready' };
    }

    const created = await send(
      `${DRIVE_FILES_ENDPOINT}?supportsAllDrives=true&fields=${FOLDER_FIELDS}`,
      {
        body: JSON.stringify({
          mimeType: FOLDER_MIME_TYPE,
          name: options.name,
          parents: [parentId],
        }),
        headers: { ...headers, 'Content-Type': 'application/json' },
        method: 'POST',
        signal: options.signal,
      },
    );

    if (!created.ok) {
      return { reason: await mapUploadFailure(created), status: 'failed' };
    }

    const folder = await created.json();

    return isFolderRef(folder)
      ? { created: true, folder, status: 'ready' }
      : { reason: 'unavailable', status: 'failed' };
  } catch (error) {
    if (isAbort(error, options.signal)) {
      return { status: 'aborted' };
    }

    return {
      reason: error instanceof TypeError ? 'offline' : 'unavailable',
      status: 'failed',
    };
  }
};
