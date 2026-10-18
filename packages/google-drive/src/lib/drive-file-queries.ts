import {
  DRIVE_FOLDER_MIME_TYPE,
  DRIVE_ROOT_LABELS,
  type DriveBrowseLocation,
} from './drive-discovery-models';

export const DRIVE_LIBRARY_QUERY =
  "trashed = false and mimeType contains 'audio/'";
const DRIVE_FOLDERS_QUERY =
  "trashed = false and mimeType = 'application/vnd.google-apps.folder'";
const DRIVE_FOLDER_OR_AUDIO_QUERY = `(${`mimeType = '${DRIVE_FOLDER_MIME_TYPE}'`} or mimeType contains 'audio/')`;
// Drive labels sheet music inconsistently: `.mxl`, `.musicxml`, and `.mscz`
// often arrive as a generic binary or XML type, and `.mid` files usually carry
// an `audio/` type. The query therefore admits those generic types, and the
// caller keeps only files whose extension or type it recognizes.
const DRIVE_FOLDER_OR_SHEET_MUSIC_QUERY = `(${[
  `mimeType = '${DRIVE_FOLDER_MIME_TYPE}'`,
  "mimeType = 'application/pdf'",
  "mimeType = 'application/octet-stream'",
  "mimeType = 'application/xml'",
  "mimeType = 'text/xml'",
  "mimeType contains 'musicxml'",
  "mimeType contains 'midi'",
  "mimeType = 'audio/mid'",
  "mimeType contains 'musescore'",
].join(' or ')})`;
const MY_DRIVE_ROOT_ID = 'root';
const SHARED_FOLDERS_ROOT_ID = 'shared-with-me';
const DRIVE_QUERY_ESCAPE_PATTERN = /['\\]/g;

export const FOLDER_SCOPE_BATCH_SIZE = 20;

export const MY_DRIVE_ROOT_LOCATION: DriveBrowseLocation = {
  id: MY_DRIVE_ROOT_ID,
  kind: 'root',
  name: DRIVE_ROOT_LABELS['my-drive'],
  rootKind: 'my-drive',
};

export const SHARED_FOLDERS_ROOT_LOCATION: DriveBrowseLocation = {
  id: SHARED_FOLDERS_ROOT_ID,
  kind: 'root',
  name: DRIVE_ROOT_LABELS.shared,
  rootKind: 'shared',
};

/** Which files a browse or search lists next to folders. */
export type DriveFileKind = 'audio' | 'sheet-music';

const FOLDER_OR_FILE_QUERIES: Record<DriveFileKind, string> = {
  audio: DRIVE_FOLDER_OR_AUDIO_QUERY,
  'sheet-music': DRIVE_FOLDER_OR_SHEET_MUSIC_QUERY,
};

const escapeDriveQueryValue = (value: string) => {
  return value.replace(DRIVE_QUERY_ESCAPE_PATTERN, '\\$&');
};

export const createBrowseQuery = (
  location: DriveBrowseLocation,
  kind: DriveFileKind = 'audio',
) => {
  const folderOrFiles = FOLDER_OR_FILE_QUERIES[kind];

  if (location.kind === 'root' && location.rootKind === 'shared') {
    return `trashed = false and sharedWithMe and ${folderOrFiles}`;
  }

  const parentId = location.kind === 'root' ? MY_DRIVE_ROOT_ID : location.id;

  return `trashed = false and '${escapeDriveQueryValue(parentId)}' in parents and ${folderOrFiles}`;
};

export const createDriveSearchQuery = (
  query: string,
  location?: DriveBrowseLocation,
  parentFolderIds: string[] = [],
  kind: DriveFileKind = 'audio',
) => {
  const folderOrFiles = FOLDER_OR_FILE_QUERIES[kind];
  const escapedQuery = escapeDriveQueryValue(query);
  const queryClause = `name contains '${escapedQuery}'`;

  if (!location) {
    return `trashed = false and ${folderOrFiles} and ${queryClause}`;
  }

  if (location.kind === 'folder') {
    const escapedFolderIds = parentFolderIds.map((parentId) => {
      return `'${escapeDriveQueryValue(parentId)}' in parents`;
    });

    if (escapedFolderIds.length === 0) {
      return `trashed = false and ${folderOrFiles} and '${escapeDriveQueryValue(location.id)}' in parents and ${queryClause}`;
    }

    return `trashed = false and ${folderOrFiles} and (${escapedFolderIds.join(' or ')}) and ${queryClause}`;
  }

  if (location.rootKind === 'shared') {
    return `trashed = false and ${folderOrFiles} and sharedWithMe and ${queryClause}`;
  }

  return `trashed = false and ${folderOrFiles} and 'me' in owners and ${queryClause}`;
};

export const createFolderDescendantQuery = (parentFolderIds: string[]) => {
  const parentFilters = parentFolderIds.map((parentId) => {
    return `'${escapeDriveQueryValue(parentId)}' in parents`;
  });

  return `${DRIVE_FOLDERS_QUERY} and (${parentFilters.join(' or ')})`;
};

export const splitIntoBatches = <Value>(values: Value[], size: number) => {
  const batches: Value[][] = [];

  for (let index = 0; index < values.length; index += size) {
    batches.push(values.slice(index, index + size));
  }

  return batches;
};
