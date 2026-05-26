import type { DriveAudioSource } from '@org/audio-library-models';

import {
  mapDriveFileToAudioSource,
  type DriveFileMetadata,
} from './google-drive-core';

export type DriveLibrarySnapshot = {
  playableSources: DriveAudioSource[];
  unavailableSources: DriveAudioSource[];
};

export type DriveDiscoveredAudioSource = DriveAudioSource & {
  locationLabel?: string;
};

export type DriveBrowseRootKind = 'my-drive' | 'shared';

export type DriveBrowseLocation = {
  id: string;
  kind: 'root' | 'folder';
  name: string;
  rootKind: DriveBrowseRootKind;
};

export type DriveFolder = {
  id: string;
  name: string;
  modifiedTime?: string;
  rootKind: DriveBrowseRootKind;
  shared: boolean;
};

export type DriveBrowseSnapshot = {
  location: DriveBrowseLocation;
  folders: DriveFolder[];
  playableSources: DriveDiscoveredAudioSource[];
  unavailableSources: DriveDiscoveredAudioSource[];
};

export type DriveSearchSnapshot = {
  query: string;
  playableSources: DriveDiscoveredAudioSource[];
  unavailableSources: DriveDiscoveredAudioSource[];
};

type DriveApiErrorPayload = {
  error?: {
    message?: string;
  };
};

const DRIVE_FOLDER_MIME_TYPE = 'application/vnd.google-apps.folder';

const DRIVE_AUDIO_FILE_FIELDS = [
  'id',
  'name',
  'mimeType',
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

const DRIVE_LIBRARY_QUERY = "trashed = false and mimeType contains 'audio/'";

const DRIVE_FOLDER_OR_AUDIO_QUERY = `(${`mimeType = '${DRIVE_FOLDER_MIME_TYPE}'`} or mimeType contains 'audio/')`;

const MY_DRIVE_ROOT_ID = 'root';
const SHARED_FOLDERS_ROOT_ID = 'shared-with-me';

const DRIVE_QUERY_ESCAPE_PATTERN = /['\\]/g;

export const MY_DRIVE_ROOT_LOCATION: DriveBrowseLocation = {
  id: MY_DRIVE_ROOT_ID,
  kind: 'root',
  name: 'My Drive',
  rootKind: 'my-drive',
};

export const SHARED_FOLDERS_ROOT_LOCATION: DriveBrowseLocation = {
  id: SHARED_FOLDERS_ROOT_ID,
  kind: 'root',
  name: 'Shared folders',
  rootKind: 'shared',
};

const escapeDriveQueryValue = (value: string) => {
  return value.replace(DRIVE_QUERY_ESCAPE_PATTERN, '\\$&');
};

const isDriveFolder = (file: DriveFileMetadata) => {
  return file.mimeType === DRIVE_FOLDER_MIME_TYPE;
};

const sortByName = <Entity extends { name: string }>(values: Entity[]) => {
  values.sort((leftValue, rightValue) => {
    return leftValue.name.localeCompare(rightValue.name, undefined, {
      sensitivity: 'base',
      numeric: true,
    });
  });

  return values;
};

const partitionSources = <Source extends DriveAudioSource>(
  sources: Source[],
) => {
  const playableSources: Source[] = [];
  const unavailableSources: Source[] = [];

  for (const source of sources) {
    if (source.availability.status === 'available') {
      playableSources.push(source);
      continue;
    }

    unavailableSources.push(source);
  }

  return {
    playableSources,
    unavailableSources,
  };
};

const mapDriveFileToDiscoveredSource = (
  file: DriveFileMetadata,
  supportedMimeTypes: string[],
  supportedExtensions: string[],
  locationLabel?: string,
): DriveDiscoveredAudioSource => {
  const source = mapDriveFileToAudioSource(
    file,
    supportedMimeTypes,
    supportedExtensions,
  );

  if (!locationLabel) {
    return source;
  }

  return {
    ...source,
    locationLabel,
  };
};

const mapDriveFileToFolder = (
  file: DriveFileMetadata,
  rootKind: DriveBrowseRootKind,
): DriveFolder => {
  return {
    id: file.id,
    name: file.name,
    modifiedTime: file.modifiedTime,
    rootKind,
    shared: file.shared ?? rootKind === 'shared',
  };
};

const createSearchLocationLabel = (file: DriveFileMetadata) => {
  return file.shared ? 'Shared with you' : 'My Drive';
};

const createBrowseQuery = (location: DriveBrowseLocation) => {
  if (location.kind === 'root' && location.rootKind === 'shared') {
    return `trashed = false and sharedWithMe and ${DRIVE_FOLDER_OR_AUDIO_QUERY}`;
  }

  const parentId = location.kind === 'root' ? MY_DRIVE_ROOT_ID : location.id;

  return `trashed = false and '${escapeDriveQueryValue(parentId)}' in parents and ${DRIVE_FOLDER_OR_AUDIO_QUERY}`;
};

const createAudioSearchQuery = (query: string) => {
  return `${DRIVE_LIBRARY_QUERY} and name contains '${escapeDriveQueryValue(query)}'`;
};

const createDriveFileSearchParams = (options: {
  query: string;
  fields: string;
  includeSharedDrives: boolean;
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

  return searchParams;
};

const createDriveFileMetadataSearchParams = (options: {
  fields: string;
  includeSharedDrives: boolean;
}) => {
  const searchParams = new URLSearchParams({
    fields: options.fields,
  });

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
  signal?: AbortSignal;
}) => {
  return fetch(
    `${DRIVE_FILES_ENDPOINT}?${createDriveFileSearchParams({
      query: options.query,
      fields: options.fields,
      includeSharedDrives: options.includeSharedDrives,
    })}`,
    {
      method: 'GET',
      signal: options.signal,
      headers: {
        Authorization: `Bearer ${options.accessToken}`,
      },
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
    `${DRIVE_FILES_ENDPOINT}/${encodeURIComponent(options.driveFileId)}?${createDriveFileMetadataSearchParams(
      {
        fields: options.fields,
        includeSharedDrives: options.includeSharedDrives,
      },
    )}`,
    {
      method: 'GET',
      signal: options.signal,
      headers: {
        Authorization: `Bearer ${options.accessToken}`,
      },
    },
  );
};

const requestDriveFilesWithFallback = async (options: {
  accessToken: string;
  query: string;
  includeSharedDrives: boolean;
  signal?: AbortSignal;
}) => {
  const attempts = [
    {
      fields: DEFAULT_FIELDS,
      includeSharedDrives: options.includeSharedDrives,
    },
    {
      fields: FALLBACK_FIELDS,
      includeSharedDrives: options.includeSharedDrives,
    },
  ];

  if (options.includeSharedDrives) {
    attempts.push({
      fields: FALLBACK_FIELDS,
      includeSharedDrives: false,
    });
  }

  let lastResponse: Response | null = null;

  for (const attempt of attempts) {
    const response = await requestDriveFiles({
      accessToken: options.accessToken,
      query: options.query,
      fields: attempt.fields,
      includeSharedDrives: attempt.includeSharedDrives,
      signal: options.signal,
    });

    if (response.ok) {
      return response;
    }

    lastResponse = response;

    if (response.status !== 400) {
      throw await createDriveRequestError(response);
    }
  }

  if (lastResponse) {
    throw await createDriveRequestError(lastResponse);
  }

  throw new Error('Drive library request failed unexpectedly.');
};

const requestDriveFileMetadataWithFallback = async (options: {
  accessToken: string;
  driveFileId: string;
  signal?: AbortSignal;
}) => {
  const attempts = [
    {
      fields: DEFAULT_FILE_FIELDS,
      includeSharedDrives: true,
    },
    {
      fields: FALLBACK_FILE_FIELDS,
      includeSharedDrives: true,
    },
    {
      fields: FALLBACK_FILE_FIELDS,
      includeSharedDrives: false,
    },
  ];

  let lastResponse: Response | null = null;

  for (const attempt of attempts) {
    const response = await requestDriveFileMetadata({
      accessToken: options.accessToken,
      driveFileId: options.driveFileId,
      fields: attempt.fields,
      includeSharedDrives: attempt.includeSharedDrives,
      signal: options.signal,
    });

    if (response.ok) {
      return response;
    }

    lastResponse = response;

    if (response.status !== 400) {
      throw await createDriveRequestError(response);
    }
  }

  if (lastResponse) {
    throw await createDriveRequestError(lastResponse);
  }

  throw new Error('Drive metadata request failed unexpectedly.');
};

const parseDriveLibrarySnapshot = async (
  response: Response,
  supportedMimeTypes: string[],
  supportedExtensions: string[],
) => {
  const payload = (await response.json()) as {
    files?: DriveFileMetadata[];
  };
  const sources: DriveAudioSource[] = [];

  for (const file of payload.files ?? []) {
    if (isDriveFolder(file)) {
      continue;
    }

    sources.push(
      mapDriveFileToAudioSource(file, supportedMimeTypes, supportedExtensions),
    );
  }

  const { playableSources, unavailableSources } = partitionSources(
    sortByName(sources),
  );

  return {
    playableSources,
    unavailableSources,
  } satisfies DriveLibrarySnapshot;
};

const parseDriveBrowseSnapshot = async (
  response: Response,
  options: {
    location: DriveBrowseLocation;
    supportedMimeTypes: string[];
    supportedExtensions: string[];
  },
) => {
  const payload = (await response.json()) as {
    files?: DriveFileMetadata[];
  };
  const folders: DriveFolder[] = [];
  const sources: DriveDiscoveredAudioSource[] = [];

  for (const file of payload.files ?? []) {
    if (isDriveFolder(file)) {
      folders.push(mapDriveFileToFolder(file, options.location.rootKind));
      continue;
    }

    sources.push(
      mapDriveFileToDiscoveredSource(
        file,
        options.supportedMimeTypes,
        options.supportedExtensions,
      ),
    );
  }

  const { playableSources, unavailableSources } = partitionSources(
    sortByName(sources),
  );

  return {
    location: options.location,
    folders: sortByName(folders),
    playableSources,
    unavailableSources,
  } satisfies DriveBrowseSnapshot;
};

const parseDriveSearchSnapshot = async (
  response: Response,
  options: {
    query: string;
    supportedMimeTypes: string[];
    supportedExtensions: string[];
  },
) => {
  const payload = (await response.json()) as {
    files?: DriveFileMetadata[];
  };
  const sources: DriveDiscoveredAudioSource[] = [];

  for (const file of payload.files ?? []) {
    if (isDriveFolder(file)) {
      continue;
    }

    sources.push(
      mapDriveFileToDiscoveredSource(
        file,
        options.supportedMimeTypes,
        options.supportedExtensions,
        createSearchLocationLabel(file),
      ),
    );
  }

  const { playableSources, unavailableSources } = partitionSources(
    sortByName(sources),
  );

  return {
    query: options.query,
    playableSources,
    unavailableSources,
  } satisfies DriveSearchSnapshot;
};

export const listDriveLibrary = async (options: {
  accessToken: string;
  supportedMimeTypes: string[];
  supportedExtensions: string[];
  signal?: AbortSignal;
}) => {
  const response = await requestDriveFilesWithFallback({
    accessToken: options.accessToken,
    query: DRIVE_LIBRARY_QUERY,
    includeSharedDrives: true,
    signal: options.signal,
  });

  return parseDriveLibrarySnapshot(
    response,
    options.supportedMimeTypes,
    options.supportedExtensions,
  );
};

export const getDriveAudioSource = async (options: {
  accessToken: string;
  driveFileId: string;
  supportedMimeTypes: string[];
  supportedExtensions: string[];
  signal?: AbortSignal;
}) => {
  const response = await requestDriveFileMetadataWithFallback({
    accessToken: options.accessToken,
    driveFileId: options.driveFileId,
    signal: options.signal,
  });
  const file = (await response.json()) as DriveFileMetadata;

  return mapDriveFileToAudioSource(
    file,
    options.supportedMimeTypes,
    options.supportedExtensions,
  );
};

export const browseDriveLocation = async (options: {
  accessToken: string;
  location: DriveBrowseLocation;
  supportedMimeTypes: string[];
  supportedExtensions: string[];
  signal?: AbortSignal;
}) => {
  const response = await requestDriveFilesWithFallback({
    accessToken: options.accessToken,
    query: createBrowseQuery(options.location),
    includeSharedDrives: true,
    signal: options.signal,
  });

  return parseDriveBrowseSnapshot(response, {
    location: options.location,
    supportedMimeTypes: options.supportedMimeTypes,
    supportedExtensions: options.supportedExtensions,
  });
};

export const searchDriveAudioFiles = async (options: {
  accessToken: string;
  query: string;
  supportedMimeTypes: string[];
  supportedExtensions: string[];
  signal?: AbortSignal;
}) => {
  const trimmedQuery = options.query.trim();

  if (!trimmedQuery) {
    return {
      query: '',
      playableSources: [],
      unavailableSources: [],
    } satisfies DriveSearchSnapshot;
  }

  const response = await requestDriveFilesWithFallback({
    accessToken: options.accessToken,
    query: createAudioSearchQuery(trimmedQuery),
    includeSharedDrives: true,
    signal: options.signal,
  });

  return parseDriveSearchSnapshot(response, {
    query: trimmedQuery,
    supportedMimeTypes: options.supportedMimeTypes,
    supportedExtensions: options.supportedExtensions,
  });
};
