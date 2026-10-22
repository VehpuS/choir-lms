const DRIVE_UPLOAD_ENDPOINT =
  'https://www.googleapis.com/upload/drive/v3/files';
const UPLOAD_FIELDS = 'id,name,mimeType';
const MULTIPART_BOUNDARY = 'choirlms-upload-boundary';
const DEFAULT_MAX_UPLOAD_BYTES = 25 * 1024 * 1024;
const DEFAULT_MIME_TYPE = 'application/octet-stream';

const UNAUTHORIZED_STATUS = 401;
const FORBIDDEN_STATUS = 403;
const NOT_FOUND_STATUS = 404;
const PAYLOAD_TOO_LARGE_STATUS = 413;
const ABORT_ERROR_NAME = 'AbortError';

// Drive error `reason` values that mean the account is out of room or is being
// throttled, as opposed to being refused.
const QUOTA_REASONS = new Set([
  'storageQuotaExceeded',
  'quotaExceeded',
  'userRateLimitExceeded',
  'rateLimitExceeded',
  'dailyLimitExceeded',
]);
const MISSING_SCOPE_REASONS = new Set([
  'insufficientPermissions',
  'forbidden',
  'authError',
]);

export type DriveUploadFailureReason =
  /** The session lacks the write scope (or its token is no longer valid). */
  | 'needs-write-access'
  | 'quota'
  /** The folder is missing, or the user may not add files to it. */
  | 'folder-not-writable'
  | 'offline'
  | 'too-large'
  | 'unavailable';

export type DriveUploadedFile = {
  id: string;
  mimeType?: string;
  name: string;
};

export type DriveUploadResult =
  | { file: DriveUploadedFile; status: 'uploaded' }
  /** The caller's signal aborted; not an error to show. */
  | { status: 'aborted' }
  | { reason: DriveUploadFailureReason; status: 'failed' };

type UploadFetch = (
  input: string,
  init: {
    body: Uint8Array;
    headers: Record<string, string>;
    method: 'POST';
    signal?: AbortSignal;
  },
) => Promise<{
  json(): Promise<unknown>;
  ok: boolean;
  status: number;
}>;

export type UploadDriveFileOptions = {
  accessToken: string;
  bytes: Uint8Array;
  /** Replaceable in specs; defaults to the global `fetch`. */
  fetch?: UploadFetch;
  folderId: string;
  maxBytes?: number;
  mimeType?: string;
  name: string;
  signal?: AbortSignal;
};

const encoder = new TextEncoder();

const buildMultipartBody = (options: {
  bytes: Uint8Array;
  folderId: string;
  mimeType: string;
  name: string;
}): Uint8Array => {
  const metadata = JSON.stringify({
    name: options.name,
    parents: [options.folderId],
  });
  const head = encoder.encode(
    `--${MULTIPART_BOUNDARY}\r\nContent-Type: application/json; charset=UTF-8\r\n\r\n${metadata}\r\n` +
      `--${MULTIPART_BOUNDARY}\r\nContent-Type: ${options.mimeType}\r\n\r\n`,
  );
  const tail = encoder.encode(`\r\n--${MULTIPART_BOUNDARY}--`);
  const body = new Uint8Array(head.length + options.bytes.length + tail.length);

  body.set(head, 0);
  body.set(options.bytes, head.length);
  body.set(tail, head.length + options.bytes.length);

  return body;
};

const readErrorReason = async (response: {
  json(): Promise<unknown>;
}): Promise<string | undefined> => {
  try {
    const payload = (await response.json()) as {
      error?: { errors?: Array<{ reason?: unknown }> };
    };
    const reason = payload.error?.errors?.[0]?.reason;

    return typeof reason === 'string' ? reason : undefined;
  } catch {
    return undefined;
  }
};

const mapUploadFailure = async (response: {
  json(): Promise<unknown>;
  status: number;
}): Promise<DriveUploadFailureReason> => {
  if (response.status === PAYLOAD_TOO_LARGE_STATUS) {
    return 'too-large';
  }

  if (response.status === NOT_FOUND_STATUS) {
    return 'folder-not-writable';
  }

  if (response.status === UNAUTHORIZED_STATUS) {
    return 'needs-write-access';
  }

  if (response.status !== FORBIDDEN_STATUS) {
    return 'unavailable';
  }

  const reason = await readErrorReason(response);

  if (reason && QUOTA_REASONS.has(reason)) {
    return 'quota';
  }

  // A 403 with a scope-shaped reason means the token cannot write at all; any
  // other 403 is Drive refusing this particular folder.
  return reason && MISSING_SCOPE_REASONS.has(reason)
    ? 'needs-write-access'
    : 'folder-not-writable';
};

const isAbort = (error: unknown, signal: AbortSignal | undefined): boolean => {
  return (
    signal?.aborted === true ||
    (error instanceof Error && error.name === ABORT_ERROR_NAME)
  );
};

/**
 * Creates a file in a Drive folder with one multipart request (the metadata
 * and the bytes together). Needs the `drive.file` scope. Never throws: every
 * outcome is a typed result so the save flow can pick the next step.
 */
export const uploadDriveFile = async (
  options: UploadDriveFileOptions,
): Promise<DriveUploadResult> => {
  if (options.bytes.length > (options.maxBytes ?? DEFAULT_MAX_UPLOAD_BYTES)) {
    return { reason: 'too-large', status: 'failed' };
  }

  const send = options.fetch ?? (globalThis.fetch as unknown as UploadFetch);

  try {
    const response = await send(
      `${DRIVE_UPLOAD_ENDPOINT}?uploadType=multipart&supportsAllDrives=true&fields=${UPLOAD_FIELDS}`,
      {
        body: buildMultipartBody({
          bytes: options.bytes,
          folderId: options.folderId,
          mimeType: options.mimeType ?? DEFAULT_MIME_TYPE,
          name: options.name,
        }),
        headers: {
          Authorization: `Bearer ${options.accessToken}`,
          'Content-Type': `multipart/related; boundary=${MULTIPART_BOUNDARY}`,
        },
        method: 'POST',
        signal: options.signal,
      },
    );

    if (!response.ok) {
      return { reason: await mapUploadFailure(response), status: 'failed' };
    }

    const file = (await response.json()) as Partial<DriveUploadedFile>;

    return typeof file.id === 'string' && typeof file.name === 'string'
      ? {
          file: {
            id: file.id,
            name: file.name,
            ...(typeof file.mimeType === 'string'
              ? { mimeType: file.mimeType }
              : {}),
          },
          status: 'uploaded',
        }
      : { reason: 'unavailable', status: 'failed' };
  } catch (error) {
    if (isAbort(error, options.signal)) {
      return { status: 'aborted' };
    }

    // `fetch` rejects with a TypeError when the request never completed.
    return {
      reason: error instanceof TypeError ? 'offline' : 'unavailable',
      status: 'failed',
    };
  }
};
