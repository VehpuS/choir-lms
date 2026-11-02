import {
  DEFAULT_MIME_TYPE,
  DRIVE_UPLOAD_ENDPOINT,
  UPLOAD_FIELDS,
  isAbort,
  mapUploadFailure,
  type DriveUploadedFile,
  type DriveUploadFailureReason,
} from './drive-file-upload';

// Drive wants every chunk but the last to be a multiple of 256 KiB.
const CHUNK_GRANULARITY_BYTES = 256 * 1024;
const DEFAULT_CHUNK_BYTES = 4 * CHUNK_GRANULARITY_BYTES;
const RESUME_INCOMPLETE_STATUS = 308;
const GONE_STATUS = 410;
const NOT_FOUND_STATUS = 404;
const SERVER_ERROR_STATUS = 500;
const RANGE_END_PATTERN = /bytes=0-(\d+)/;

/** Where the bytes come from, so a long file never has to sit in memory. */
export type DriveUploadSource = {
  /** Bytes in `[start, end)`. */
  read(start: number, end: number): Promise<Uint8Array>;
  size: number;
};

export const bytesUploadSource = (bytes: Uint8Array): DriveUploadSource => ({
  read: async (start, end) => bytes.subarray(start, end),
  size: bytes.length,
});

type ResumableResponse = {
  headers: { get(name: string): string | null };
  json(): Promise<unknown>;
  ok: boolean;
  status: number;
};

export type ResumableFetch = (
  input: string,
  init: {
    body?: Uint8Array | string;
    headers: Record<string, string>;
    method: 'POST' | 'PUT';
    signal?: AbortSignal;
  },
) => Promise<ResumableResponse>;

export type DriveResumableUploadResult =
  | { file: DriveUploadedFile; status: 'uploaded' }
  | { status: 'aborted'; resumeUri?: string }
  | {
      reason: DriveUploadFailureReason;
      /** Pass back as `resumeUri` to continue from the last stored chunk. */
      resumeUri?: string;
      status: 'failed';
    };

export type UploadDriveFileResumableOptions = {
  accessToken: string;
  chunkBytes?: number;
  fetch?: ResumableFetch;
  folderId: string;
  mimeType?: string;
  name: string;
  /** Called with the fraction (0–1) of bytes Drive has stored. */
  onProgress?: (uploadedBytes: number, totalBytes: number) => void;
  /** Called once a session exists, so the caller can keep it to resume. */
  onSession?: (resumeUri: string) => void;
  /** A session from an earlier attempt; a dead one starts over. */
  resumeUri?: string;
  signal?: AbortSignal;
  source: DriveUploadSource;
};

const toFile = (payload: unknown): DriveUploadedFile | undefined => {
  const file = payload as Partial<DriveUploadedFile> | undefined;

  return typeof file?.id === 'string' && typeof file.name === 'string'
    ? {
        id: file.id,
        name: file.name,
        ...(typeof file.mimeType === 'string'
          ? { mimeType: file.mimeType }
          : {}),
      }
    : undefined;
};

/** Bytes Drive already holds, from a 308's `Range: bytes=0-N` (none means 0). */
const storedBytes = (response: ResumableResponse): number => {
  const match = RANGE_END_PATTERN.exec(response.headers.get('Range') ?? '');

  return match ? Number(match[1]) + 1 : 0;
};

const roundChunk = (chunkBytes: number | undefined): number => {
  const wanted = chunkBytes ?? DEFAULT_CHUNK_BYTES;

  return Math.max(
    CHUNK_GRANULARITY_BYTES,
    Math.floor(wanted / CHUNK_GRANULARITY_BYTES) * CHUNK_GRANULARITY_BYTES,
  );
};

/**
 * Uploads a file with Drive's resumable protocol: chunked, with progress and
 * cancel, and continuing from the last stored chunk when given the session of
 * an earlier attempt. Needs the `drive.file` scope. Never throws.
 */
export const uploadDriveFileResumable = async (
  options: UploadDriveFileResumableOptions,
): Promise<DriveResumableUploadResult> => {
  const send = options.fetch ?? (globalThis.fetch as unknown as ResumableFetch);
  const { accessToken, signal, source } = options;
  const chunkBytes = roundChunk(options.chunkBytes);
  const authorization = { Authorization: `Bearer ${accessToken}` };
  let sessionUri = options.resumeUri;

  const withSession = () => (sessionUri ? { resumeUri: sessionUri } : {});
  const fail = (
    reason: DriveUploadFailureReason,
  ): DriveResumableUploadResult => ({
    reason,
    status: 'failed',
    ...withSession(),
  });
  const guard = (error: unknown): DriveResumableUploadResult =>
    isAbort(error, signal)
      ? { status: 'aborted', ...withSession() }
      : fail(error instanceof TypeError ? 'offline' : 'unavailable');

  const start = async (): Promise<
    | { ok: true; value: string }
    | { ok: false; result: DriveResumableUploadResult }
  > => {
    try {
      const response = await send(
        `${DRIVE_UPLOAD_ENDPOINT}?uploadType=resumable&supportsAllDrives=true&fields=${UPLOAD_FIELDS}`,
        {
          body: JSON.stringify({
            name: options.name,
            parents: [options.folderId],
          }),
          headers: {
            ...authorization,
            'Content-Type': 'application/json; charset=UTF-8',
            'X-Upload-Content-Length': String(source.size),
            'X-Upload-Content-Type': options.mimeType ?? DEFAULT_MIME_TYPE,
          },
          method: 'POST',
          signal,
        },
      );
      const location = response.headers.get('Location');

      if (!response.ok) {
        return {
          ok: false,
          result: {
            reason: await mapUploadFailure(response),
            status: 'failed',
          },
        };
      }

      return location
        ? { ok: true, value: location }
        : { ok: false, result: fail('unavailable') };
    } catch (error) {
      return { ok: false, result: guard(error) };
    }
  };

  // Sends one PUT; `body` absent asks Drive how much it holds.
  const put = (range: string, body?: Uint8Array) =>
    send(sessionUri as string, {
      ...(body ? { body } : {}),
      headers: { ...authorization, 'Content-Range': range },
      method: 'PUT',
      signal,
    });

  const isDeadSession = (status: number) =>
    status === NOT_FOUND_STATUS || status === GONE_STATUS;

  if (!sessionUri) {
    const started = await start();

    if (!started.ok) return started.result;
    sessionUri = started.value;
    options.onSession?.(sessionUri);
  }

  let offset = 0;
  let restarted = !options.resumeUri;

  // Asks where a resumed session stands; a dead one is replaced once.
  if (options.resumeUri) {
    try {
      const response = await put(`bytes */${source.size}`);

      if (response.ok) {
        const file = toFile(await response.json());

        return file
          ? { file, status: 'uploaded' }
          : { reason: 'unavailable', resumeUri: sessionUri, status: 'failed' };
      }

      if (response.status === RESUME_INCOMPLETE_STATUS) {
        offset = storedBytes(response);
      } else if (isDeadSession(response.status)) {
        const started = await start();

        if (!started.ok) return started.result;
        sessionUri = started.value;
        options.onSession?.(sessionUri);
        restarted = true;
      } else {
        return {
          reason: await mapUploadFailure(response),
          resumeUri: sessionUri,
          status: 'failed',
        };
      }
    } catch (error) {
      return guard(error);
    }
  }

  options.onProgress?.(offset, source.size);

  for (;;) {
    const end = Math.min(offset + chunkBytes, source.size);
    const isLast = end >= source.size;

    try {
      const body = await source.read(offset, end);
      // An empty file has no range to name, so Drive is told its size alone.
      const range =
        source.size === 0
          ? 'bytes */0'
          : `bytes ${offset}-${end - 1}/${source.size}`;
      const response = await put(range, body);

      if (response.ok) {
        const file = toFile(await response.json());

        options.onProgress?.(source.size, source.size);

        return file
          ? { file, status: 'uploaded' }
          : { reason: 'unavailable', resumeUri: sessionUri, status: 'failed' };
      }

      if (response.status === RESUME_INCOMPLETE_STATUS && !isLast) {
        offset = storedBytes(response);
        options.onProgress?.(offset, source.size);
        continue;
      }

      if (isDeadSession(response.status) && !restarted) {
        // The session expired mid-way: start again once from the beginning.
        const started = await start();

        if (!started.ok) return started.result;
        sessionUri = started.value;
        options.onSession?.(sessionUri);
        restarted = true;
        offset = 0;
        continue;
      }

      const reason =
        response.status >= SERVER_ERROR_STATUS ||
        response.status === RESUME_INCOMPLETE_STATUS
          ? 'unavailable'
          : await mapUploadFailure(response);

      return { reason, resumeUri: sessionUri, status: 'failed' };
    } catch (error) {
      return guard(error);
    }
  }
};
