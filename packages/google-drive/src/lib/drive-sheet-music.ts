import {
  detectSheetMusicFormat,
  type SheetMusicFormat,
} from '@org/audio-library-models';

import {
  isDriveFolder,
  mapDriveFileToFolder,
  sortByName,
  type DriveBrowseLocation,
  type DriveBrowseRootKind,
  type DriveFolder,
} from './drive-discovery-models';
import {
  createBrowseQuery,
  createDriveSearchQuery,
} from './drive-file-queries';
import {
  requestAllDriveFilesWithFallback,
  requestDriveFilesWithFallback,
} from './drive-files-client';
import type { DriveFilesPage } from './drive-files-paginator';
import type { DriveFileMetadata } from './google-drive-core';

/** A Drive file the sheet music picker can offer, with the format it will be read as. */
export type DriveSheetMusicFile = {
  format: Exclude<SheetMusicFormat, 'link'>;
  id: string;
  mimeType: string;
  modifiedTime?: string;
  name: string;
};

export type DriveSheetMusicListing = {
  files: DriveSheetMusicFile[];
  folders: DriveFolder[];
  /** True when a search stopped at its page limit and more matches exist. */
  hasMore?: boolean;
};

// A name such as `pdf` can match thousands of files, and a listing shows
// nothing until its pages arrive, so a search reads at most this many pages
// (100 Drive entries each) and says when it stopped.
export const SHEET_MUSIC_SEARCH_PAGE_LIMIT = 3;

/**
 * Splits a Drive listing into folders and supported sheet music files. The
 * extension decides first and the MIME type second, so a `.mxl` that Drive
 * calls `application/octet-stream` is kept and a `.docx` is hidden.
 */
export const toDriveSheetMusicListing = (
  files: DriveFileMetadata[],
  rootKind: DriveBrowseRootKind,
): DriveSheetMusicListing => {
  const folders: DriveFolder[] = [];
  const sheetMusicFiles: DriveSheetMusicFile[] = [];

  for (const file of files) {
    if (isDriveFolder(file)) {
      folders.push(mapDriveFileToFolder(file, rootKind));
      continue;
    }

    const format = detectSheetMusicFormat({
      mimeType: file.mimeType,
      name: file.name,
    });

    if (format === 'refused' || format === 'link') {
      continue;
    }

    sheetMusicFiles.push({
      format,
      id: file.id,
      mimeType: file.mimeType,
      ...(file.modifiedTime ? { modifiedTime: file.modifiedTime } : {}),
      name: file.name,
    });
  }

  return {
    files: sortByName(sheetMusicFiles),
    folders: sortByName(folders),
  };
};

export const browseDriveSheetMusic = async (options: {
  accessToken: string;
  location: DriveBrowseLocation;
  signal?: AbortSignal;
}): Promise<DriveSheetMusicListing> => {
  const files = await requestAllDriveFilesWithFallback({
    accessToken: options.accessToken,
    includeSharedDrives: true,
    query: createBrowseQuery(options.location, 'sheet-music'),
    signal: options.signal,
  });

  return toDriveSheetMusicListing(files, options.location.rootKind);
};

/**
 * Searches by name across the user's Drive and what is shared with them. It
 * lists files only: a name often matches many folders, and a folder is reached
 * by browsing.
 */
export const searchDriveSheetMusic = async (options: {
  accessToken: string;
  query: string;
  signal?: AbortSignal;
}): Promise<DriveSheetMusicListing> => {
  const query = options.query.trim();

  if (!query) {
    return { files: [], folders: [] };
  }

  const driveQuery = createDriveSearchQuery(
    query,
    undefined,
    [],
    'sheet-music',
  );
  const files: DriveFileMetadata[] = [];
  let pageToken: string | undefined;
  let hasMore = false;

  for (let page = 0; page < SHEET_MUSIC_SEARCH_PAGE_LIMIT; page += 1) {
    const response = await requestDriveFilesWithFallback({
      accessToken: options.accessToken,
      includeSharedDrives: true,
      pageToken,
      query: driveQuery,
      signal: options.signal,
    });
    const payload = (await response.json()) as DriveFilesPage;

    files.push(...(payload.files ?? []));
    pageToken = payload.nextPageToken;

    if (!pageToken) {
      break;
    }

    hasMore = page === SHEET_MUSIC_SEARCH_PAGE_LIMIT - 1;
  }

  return {
    files: toDriveSheetMusicListing(files, 'my-drive').files,
    folders: [],
    ...(hasMore ? { hasMore } : {}),
  };
};
