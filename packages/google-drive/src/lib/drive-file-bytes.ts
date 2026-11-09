import {
  isAbort,
  mapUploadFailure,
  type DriveUploadFailureReason,
} from './drive-file-upload';

const DRIVE_FILES_ENDPOINT = 'https://www.googleapis.com/drive/v3/files';

type BytesFetch = (
  input: string,
  init: {
    headers: Record<string, string>;
    method: 'GET';
    signal?: AbortSignal;
  },
) => Promise<{
  arrayBuffer(): Promise<ArrayBuffer>;
  json(): Promise<unknown>;
  ok: boolean;
  status: number;
}>;

export type ReadDriveFileBytesResult =
  | { status: 'ok'; bytes: Uint8Array }
  | { status: 'aborted' }
  | { status: 'failed'; reason: DriveUploadFailureReason };

/** Downloads a Drive file's content, for the audio of a recording in a bundle. Never throws. */
export const readDriveFileBytes = async (options: {
  accessToken: string;
  fetch?: BytesFetch;
  fileId: string;
  signal?: AbortSignal;
}): Promise<ReadDriveFileBytesResult> => {
  const send = options.fetch ?? (globalThis.fetch as unknown as BytesFetch);

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
      ? { status: 'ok', bytes: new Uint8Array(await response.arrayBuffer()) }
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
