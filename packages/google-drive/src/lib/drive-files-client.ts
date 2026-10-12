import {
  paginateDriveFiles,
  type DriveFilesPage,
  type DriveFilesPageProgress,
} from './drive-files-paginator';

type DriveApiErrorPayload = {
  error?: {
    message?: string;
  };
};

const DRIVE_AUDIO_FILE_FIELDS = [
  'id',
  'name',
  'mimeType',
  'parents',
  'fileExtension',
  'size',
  'modifiedTime',
  'webViewLink',
  'iconLink',
  'shared',
].join(',');
const DEFAULT_FIELDS = [
  `files(${DRIVE_AUDIO_FILE_FIELDS},audioMediaMetadata/durationMillis)`,
  'nextPageToken',
].join(',');
const FALLBACK_FIELDS = [
  `files(${DRIVE_AUDIO_FILE_FIELDS})`,
  'nextPageToken',
].join(',');
const DEFAULT_FILE_FIELDS = [
  DRIVE_AUDIO_FILE_FIELDS,
  'audioMediaMetadata/durationMillis',
].join(',');
const FALLBACK_FILE_FIELDS = DRIVE_AUDIO_FILE_FIELDS;
const DRIVE_FILES_ENDPOINT = 'https://www.googleapis.com/drive/v3/files';

// Drive rejects `audioMediaMetadata/durationMillis` as an invalid field for
// some files and accounts (the API documents no audio metadata), so asking for
// it first used to cost a failed round trip, and a retry, on every listing and
// every ancestor lookup (task 8.48). Once a request with the field fails with a
// 400 and the same request without it succeeds, the field is left out for the
// rest of the session; once a request with it succeeds, it stays in.
type DurationFieldSupport = 'supported' | 'unknown' | 'unsupported';

let durationFieldSupport: DurationFieldSupport = 'unknown';

export const resetDriveDurationFieldSupport = () => {
  durationFieldSupport = 'unknown';
};

type FieldAttempt = {
  fields: string;
  includeSharedDrives: boolean;
  withDuration?: boolean;
};

const prepareFieldAttempts = (attempts: FieldAttempt[]) =>
  attempts.filter(
    (attempt) =>
      !(attempt.withDuration && durationFieldSupport === 'unsupported'),
  );

// Learns from one finished attempt. `rejectedDurationAttempt` is the earlier
// attempt that asked for the field and got a 400. Only a success of the same
// request without the field (same shared-drive flag) shows the field was the
// problem; a later success after other changes proves nothing about it.
const rememberDurationFieldOutcome = (
  attempt: FieldAttempt,
  rejectedDurationAttempt: FieldAttempt | null,
) => {
  if (attempt.withDuration) {
    durationFieldSupport = 'supported';
  } else if (
    rejectedDurationAttempt &&
    rejectedDurationAttempt.includeSharedDrives ===
      attempt.includeSharedDrives &&
    durationFieldSupport === 'unknown'
  ) {
    durationFieldSupport = 'unsupported';
  }
};

const createDriveFileSearchParams = (options: {
  query: string;
  fields: string;
  includeSharedDrives: boolean;
  pageToken?: string;
}) => {
  const searchParams = new URLSearchParams({
    q: options.query,
    fields: options.fields,
    pageSize: '100',
    spaces: 'drive',
    orderBy: 'name_natural',
  });

  if (options.includeSharedDrives) {
    searchParams.set('supportsAllDrives', 'true');
    searchParams.set('includeItemsFromAllDrives', 'true');
  }

  if (options.pageToken) {
    searchParams.set('pageToken', options.pageToken);
  }

  return searchParams;
};

const createDriveFileMetadataSearchParams = (options: {
  fields: string;
  includeSharedDrives: boolean;
}) => {
  const searchParams = new URLSearchParams({ fields: options.fields });

  if (options.includeSharedDrives) {
    searchParams.set('supportsAllDrives', 'true');
  }

  return searchParams;
};

const readDriveErrorMessage = async (response: Response) => {
  const rawBody = (await response.text()).trim();

  if (!rawBody) {
    return undefined;
  }

  try {
    const parsedBody = JSON.parse(rawBody) as DriveApiErrorPayload;

    if (typeof parsedBody.error?.message === 'string') {
      return parsedBody.error.message;
    }
  } catch {
    return rawBody;
  }

  return rawBody;
};

const createDriveRequestError = async (response: Response) => {
  const errorDetail = await readDriveErrorMessage(response);

  if (!errorDetail) {
    return new Error(`Drive library request failed with ${response.status}`);
  }

  return new Error(
    `Drive library request failed with ${response.status}: ${errorDetail}`,
  );
};

const requestDriveFiles = async (options: {
  accessToken: string;
  query: string;
  fields: string;
  includeSharedDrives: boolean;
  pageToken?: string;
  signal?: AbortSignal;
}) => {
  return fetch(
    `${DRIVE_FILES_ENDPOINT}?${createDriveFileSearchParams(options)}`,
    {
      method: 'GET',
      signal: options.signal,
      headers: { Authorization: `Bearer ${options.accessToken}` },
    },
  );
};

const requestDriveFileMetadata = async (options: {
  accessToken: string;
  driveFileId: string;
  fields: string;
  includeSharedDrives: boolean;
  signal?: AbortSignal;
}) => {
  return fetch(
    `${DRIVE_FILES_ENDPOINT}/${encodeURIComponent(options.driveFileId)}?${createDriveFileMetadataSearchParams(options)}`,
    {
      method: 'GET',
      signal: options.signal,
      headers: { Authorization: `Bearer ${options.accessToken}` },
    },
  );
};

export const requestDriveFilesWithFallback = async (options: {
  accessToken: string;
  query: string;
  includeSharedDrives: boolean;
  pageToken?: string;
  signal?: AbortSignal;
}) => {
  const allAttempts: FieldAttempt[] = [
    {
      fields: DEFAULT_FIELDS,
      includeSharedDrives: options.includeSharedDrives,
      withDuration: true,
    },
    {
      fields: FALLBACK_FIELDS,
      includeSharedDrives: options.includeSharedDrives,
    },
  ];

  if (options.includeSharedDrives) {
    allAttempts.push({ fields: FALLBACK_FIELDS, includeSharedDrives: false });
  }

  const attempts = prepareFieldAttempts(allAttempts);
  let lastResponse: Response | null = null;
  let rejectedDurationAttempt: FieldAttempt | null = null;

  for (const attempt of attempts) {
    const response = await requestDriveFiles({
      ...options,
      fields: attempt.fields,
      includeSharedDrives: attempt.includeSharedDrives,
    });

    if (response.ok) {
      rememberDurationFieldOutcome(attempt, rejectedDurationAttempt);
      return response;
    }

    lastResponse = response;
    if (attempt.withDuration) {
      rejectedDurationAttempt = attempt;
    }

    if (response.status !== 400) {
      throw await createDriveRequestError(response);
    }
  }

  if (lastResponse) {
    throw await createDriveRequestError(lastResponse);
  }

  throw new Error('Drive library request failed unexpectedly.');
};

export const requestAllDriveFilesWithFallback = async (options: {
  accessToken: string;
  query: string;
  includeSharedDrives: boolean;
  onPage?: (progress: DriveFilesPageProgress) => Promise<void> | void;
  signal?: AbortSignal;
}) => {
  return paginateDriveFiles({
    onPage: options.onPage,
    requestPage: async ({ pageToken, signal }) => {
      const response = await requestDriveFilesWithFallback({
        ...options,
        pageToken,
        signal,
      });

      return (await response.json()) as DriveFilesPage;
    },
    signal: options.signal,
  });
};

export const requestDriveFileMetadataWithFallback = async (options: {
  accessToken: string;
  driveFileId: string;
  signal?: AbortSignal;
}) => {
  const attempts = prepareFieldAttempts([
    {
      fields: DEFAULT_FILE_FIELDS,
      includeSharedDrives: true,
      withDuration: true,
    },
    { fields: FALLBACK_FILE_FIELDS, includeSharedDrives: true },
    { fields: FALLBACK_FILE_FIELDS, includeSharedDrives: false },
  ]);
  let lastResponse: Response | null = null;
  let rejectedDurationAttempt: FieldAttempt | null = null;

  for (const attempt of attempts) {
    const response = await requestDriveFileMetadata({
      ...options,
      fields: attempt.fields,
      includeSharedDrives: attempt.includeSharedDrives,
    });

    if (response.ok) {
      rememberDurationFieldOutcome(attempt, rejectedDurationAttempt);
      return response;
    }

    lastResponse = response;
    if (attempt.withDuration) {
      rejectedDurationAttempt = attempt;
    }

    if (response.status !== 400) {
      throw await createDriveRequestError(response);
    }
  }

  if (lastResponse) {
    throw await createDriveRequestError(lastResponse);
  }

  throw new Error('Drive metadata request failed unexpectedly.');
};
