import type { DriveFileMetadata } from './google-drive-core';

export type DriveFilesPage = {
  files?: DriveFileMetadata[];
  nextPageToken?: string;
};

export type DriveFilesPageRequest = (options: {
  pageToken?: string;
  signal?: AbortSignal;
}) => Promise<DriveFilesPage>;

export const paginateDriveFiles = async (options: {
  requestPage: DriveFilesPageRequest;
  signal?: AbortSignal;
}) => {
  const files: DriveFileMetadata[] = [];
  const seenFileIds = new Set<string>();
  const seenPageTokens = new Set<string>();
  let pageToken: string | undefined;

  do {
    options.signal?.throwIfAborted();

    const page = await options.requestPage({
      pageToken,
      signal: options.signal,
    });

    for (const file of page.files ?? []) {
      if (seenFileIds.has(file.id)) {
        continue;
      }

      seenFileIds.add(file.id);
      files.push(file);
    }

    pageToken = page.nextPageToken;

    if (pageToken && seenPageTokens.has(pageToken)) {
      throw new Error(`Drive files pagination repeated token: ${pageToken}`);
    }

    if (pageToken) {
      seenPageTokens.add(pageToken);
    }
  } while (pageToken);

  return files;
};
