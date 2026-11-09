import { type DriveUploadFailureReason } from './drive-file-upload';
import {
  bytesUploadSource,
  uploadDriveFileResumable,
  type ResumableFetch,
} from './drive-resumable-upload';

export const DRIVE_FILES_ENDPOINT = 'https://www.googleapis.com/drive/v3/files';
export const JSON_MIME_TYPE = 'application/json';
export const BUNDLE_PROPERTY_KEY = 'choirlmsBundle';
export const BUNDLE_PROPERTY_VALUE = 'v1';

/** Marks a file as a bundle the app wrote, so discovery does not rely on names alone. */
export const BUNDLE_APP_PROPERTIES = {
  [BUNDLE_PROPERTY_KEY]: BUNDLE_PROPERTY_VALUE,
};

export type DriveBundleFetch = (
  input: string,
  init: {
    body?: string;
    headers: Record<string, string>;
    method: 'GET' | 'PATCH';
    signal?: AbortSignal;
  },
) => Promise<{
  json(): Promise<unknown>;
  ok: boolean;
  status: number;
  text(): Promise<string>;
}>;

export type BundleRequestOptions = {
  accessToken: string;
  fetch?: DriveBundleFetch;
  signal?: AbortSignal;
};

export type UploadLibraryBundleOptions = {
  accessToken: string;
  fetch?: ResumableFetch;
  folderId: string;
  /** The serialized bundle. */
  json: string;
  name: string;
  onProgress?: (uploadedBytes: number, totalBytes: number) => void;
  signal?: AbortSignal;
};

export type UploadLibraryBundleResult =
  | { status: 'uploaded'; file: { id: string; name: string } }
  | { status: 'aborted' }
  | { status: 'failed'; reason: DriveUploadFailureReason };

/**
 * Writes a bundle with the resumable uploader. Drive creates the file only
 * when the last chunk lands, so a failed or cancelled upload leaves nothing
 * listed.
 */
export const uploadLibraryBundle = async (
  options: UploadLibraryBundleOptions,
): Promise<UploadLibraryBundleResult> => {
  const result = await uploadDriveFileResumable({
    accessToken: options.accessToken,
    appProperties: BUNDLE_APP_PROPERTIES,
    fetch: options.fetch,
    folderId: options.folderId,
    mimeType: JSON_MIME_TYPE,
    name: options.name,
    onProgress: options.onProgress,
    signal: options.signal,
    source: bytesUploadSource(new TextEncoder().encode(options.json)),
  });

  if (result.status === 'uploaded') {
    return {
      status: 'uploaded',
      file: { id: result.file.id, name: result.file.name },
    };
  }

  return result.status === 'aborted'
    ? { status: 'aborted' }
    : { status: 'failed', reason: result.reason };
};
