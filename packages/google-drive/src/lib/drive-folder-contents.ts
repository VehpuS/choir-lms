import {
  isDriveFolder,
  mapDriveFileToDiscoveredSource,
  mapDriveFileToFolder,
  partitionSources,
  type DriveBrowseRootKind,
  type DriveDiscoveredAudioSource,
  type DriveFolder,
} from './drive-discovery-models';
import { createBrowseQuery } from './drive-file-queries';
import { requestAllDriveFilesWithFallback } from './drive-files-client';

export type DriveEnumeratedFolder = DriveFolder & {
  parentFolderId: string;
};

export type DriveEnumeratedAudioSource = DriveDiscoveredAudioSource & {
  parentFolderId: string;
};

export type DriveFolderContents = {
  folders: DriveEnumeratedFolder[];
  playableSources: DriveEnumeratedAudioSource[];
  unavailableSources: DriveEnumeratedAudioSource[];
};

const mapEnumeratedFolder = (options: {
  file: Parameters<typeof mapDriveFileToFolder>[0];
  parentFolderId: string;
  rootKind: DriveBrowseRootKind;
}): DriveEnumeratedFolder => {
  return {
    ...mapDriveFileToFolder(options.file, options.rootKind),
    parentFolderId: options.parentFolderId,
  };
};

export const enumerateDriveFolderContents = async (options: {
  accessToken: string;
  rootFolder: DriveFolder;
  supportedMimeTypes: string[];
  supportedExtensions: string[];
  signal?: AbortSignal;
}): Promise<DriveFolderContents> => {
  const folders: DriveEnumeratedFolder[] = [];
  const sourcesById = new Map<string, DriveEnumeratedAudioSource>();
  const visitedFolderIds = new Set<string>([options.rootFolder.id]);
  const pendingFolders: DriveFolder[] = [options.rootFolder];

  for (let index = 0; index < pendingFolders.length; index += 1) {
    options.signal?.throwIfAborted();

    const parentFolder = pendingFolders[index];

    if (!parentFolder) {
      continue;
    }

    const files = await requestAllDriveFilesWithFallback({
      accessToken: options.accessToken,
      query: createBrowseQuery({
        id: parentFolder.id,
        kind: 'folder',
        name: parentFolder.name,
        rootKind: options.rootFolder.rootKind,
      }),
      includeSharedDrives: true,
      signal: options.signal,
    });

    for (const file of files) {
      if (isDriveFolder(file)) {
        if (visitedFolderIds.has(file.id)) {
          continue;
        }

        const folder = mapEnumeratedFolder({
          file,
          parentFolderId: parentFolder.id,
          rootKind: options.rootFolder.rootKind,
        });
        visitedFolderIds.add(folder.id);
        folders.push(folder);
        pendingFolders.push(folder);
        continue;
      }

      if (sourcesById.has(file.id)) {
        continue;
      }

      sourcesById.set(file.id, {
        ...mapDriveFileToDiscoveredSource(
          file,
          options.supportedMimeTypes,
          options.supportedExtensions,
        ),
        parentFolderId: parentFolder.id,
      });
    }
  }

  const { playableSources, unavailableSources } = partitionSources([
    ...sourcesById.values(),
  ]);

  return {
    folders,
    playableSources,
    unavailableSources,
  };
};
