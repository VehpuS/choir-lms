import {
  DRIVE_FOLDER_MIME_TYPE,
  type DriveBrowseLocation,
} from './drive-discovery-models';

export const DRIVE_LIBRARY_QUERY =
  "trashed = false and mimeType contains 'audio/'";
const DRIVE_FOLDERS_QUERY =
  "trashed = false and mimeType = 'application/vnd.google-apps.folder'";
const DRIVE_FOLDER_OR_AUDIO_QUERY = `(${`mimeType = '${DRIVE_FOLDER_MIME_TYPE}'`} or mimeType contains 'audio/')`;
const MY_DRIVE_ROOT_ID = 'root';
const SHARED_FOLDERS_ROOT_ID = 'shared-with-me';
const DRIVE_QUERY_ESCAPE_PATTERN = /['\\]/g;

export const FOLDER_SCOPE_BATCH_SIZE = 20;
export const FOLDER_AUDIO_SEARCH_BATCH_SIZE = 20;

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

export const createBrowseQuery = (location: DriveBrowseLocation) => {
  if (location.kind === 'root' && location.rootKind === 'shared') {
    return `trashed = false and sharedWithMe and ${DRIVE_FOLDER_OR_AUDIO_QUERY}`;
  }

  const parentId = location.kind === 'root' ? MY_DRIVE_ROOT_ID : location.id;

  return `trashed = false and '${escapeDriveQueryValue(parentId)}' in parents and ${DRIVE_FOLDER_OR_AUDIO_QUERY}`;
};

export const createDriveSearchQuery = (
  query: string,
  location?: DriveBrowseLocation,
  parentFolderIds: string[] = [],
) => {
  const escapedQuery = escapeDriveQueryValue(query);
  const queryClause = `name contains '${escapedQuery}'`;

  if (!location) {
    return `trashed = false and ${DRIVE_FOLDER_OR_AUDIO_QUERY} and ${queryClause}`;
  }

  if (location.kind === 'folder') {
    const escapedFolderIds = parentFolderIds.map((parentId) => {
      return `'${escapeDriveQueryValue(parentId)}' in parents`;
    });

    if (escapedFolderIds.length === 0) {
      return `trashed = false and ${DRIVE_FOLDER_OR_AUDIO_QUERY} and '${escapeDriveQueryValue(location.id)}' in parents and ${queryClause}`;
    }

    return `trashed = false and ${DRIVE_FOLDER_OR_AUDIO_QUERY} and (${escapedFolderIds.join(' or ')}) and ${queryClause}`;
  }

  if (location.rootKind === 'shared') {
    return `trashed = false and ${DRIVE_FOLDER_OR_AUDIO_QUERY} and sharedWithMe and ${queryClause}`;
  }

  return `trashed = false and ${DRIVE_FOLDER_OR_AUDIO_QUERY} and 'me' in owners and ${queryClause}`;
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
