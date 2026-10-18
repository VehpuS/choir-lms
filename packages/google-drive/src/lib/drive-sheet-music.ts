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
import { walkFolderTree } from './drive-folder-descendants';
import { requestAllDriveFilesWithFallback } from './drive-files-client';
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
  /** True when some folders could not be searched, so files may be missing. */
  isIncomplete?: boolean;
};

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

/** Called with everything read so far while a request is still paging. */
export type DriveSheetMusicProgress = (listing: DriveSheetMusicListing) => void;

/**
 * Lists a folder (or a root). A folder with hundreds of entries arrives a page
 * at a time, so `onProgress` hands the caller the first page at once instead
 * of making it wait for the last.
 */
export const browseDriveSheetMusic = async (options: {
  accessToken: string;
  location: DriveBrowseLocation;
  onProgress?: DriveSheetMusicProgress;
  signal?: AbortSignal;
}): Promise<DriveSheetMusicListing> => {
  const { location, onProgress } = options;
  const readSoFar: DriveFileMetadata[] = [];
  const files = await requestAllDriveFilesWithFallback({
    accessToken: options.accessToken,
    includeSharedDrives: true,
    onPage: ({ files: pageFiles, hasMore }) => {
      readSoFar.push(...pageFiles);

      // The last page is the return value, so only partial pages are reported.
      if (hasMore) {
        onProgress?.(toDriveSheetMusicListing(readSoFar, location.rootKind));
      }
    },
    query: createBrowseQuery(location, 'sheet-music'),
    signal: options.signal,
  });

  return toDriveSheetMusicListing(files, location.rootKind);
};

/**
 * Searches by name, to the end: it never stops at a result limit, and
 * `onProgress` reports the matches found so far after every page. With a
 * folder `location` the search covers that folder and every folder under it,
 * batch by batch as the folders are discovered, so matches stream in; without
 * one it covers the user's Drive and what is shared with them. It lists files
 * only: a name often matches many folders, and a folder is reached by browsing.
 */
export const searchDriveSheetMusic = async (options: {
  accessToken: string;
  /** A folder to search inside, subfolders included. */
  location?: DriveBrowseLocation;
  onProgress?: DriveSheetMusicProgress;
  query: string;
  signal?: AbortSignal;
}): Promise<DriveSheetMusicListing> => {
  const query = options.query.trim();

  if (!query) {
    return { files: [], folders: [] };
  }

  const found = new Map<string, DriveFileMetadata>();
  const searchQuery = async (driveQuery: string) => {
    await requestAllDriveFilesWithFallback({
      accessToken: options.accessToken,
      includeSharedDrives: true,
      onPage: ({ files }) => {
        for (const file of files) {
          found.set(file.id, file);
        }

        options.onProgress?.(toFilesOnlyListing([...found.values()]));
      },
      query: driveQuery,
      signal: options.signal,
    });
  };
  let isIncomplete = false;

  if (options.location?.kind === 'folder') {
    const { location } = options;
    const walk = await walkFolderTree({
      accessToken: options.accessToken,
      rootFolderId: location.id,
      signal: options.signal,
      visit: (folderIds) =>
        searchQuery(
          createDriveSearchQuery(query, location, folderIds, 'sheet-music'),
        ),
    });

    isIncomplete = walk.isIncomplete;
  } else {
    await searchQuery(
      createDriveSearchQuery(query, undefined, [], 'sheet-music'),
    );
  }

  return {
    ...toFilesOnlyListing([...found.values()]),
    ...(isIncomplete ? { isIncomplete } : {}),
  };
};

const toFilesOnlyListing = (
  files: DriveFileMetadata[],
): DriveSheetMusicListing => ({
  files: toDriveSheetMusicListing(files, 'my-drive').files,
  folders: [],
});
