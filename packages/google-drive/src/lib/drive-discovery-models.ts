import type { DriveAudioSource } from '@org/audio-library-models';

import {
  mapDriveFileToAudioSource,
  type DriveFileMetadata,
} from './google-drive-core';
import type {
  DrivePathSegment,
  DriveResolvedPath,
} from './drive-path-resolver';

export const DRIVE_FOLDER_MIME_TYPE = 'application/vnd.google-apps.folder';

export type DriveLibrarySnapshot = {
  playableSources: DriveAudioSource[];
  unavailableSources: DriveAudioSource[];
};

export type DriveDiscoveredAudioSource = DriveAudioSource & {
  locationLabel?: string;
  path?: DrivePathSegment[];
  rootKind?: DriveBrowseRootKind;
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
  locationLabel?: string;
  name: string;
  modifiedTime?: string;
  path?: DrivePathSegment[];
  rootKind: DriveBrowseRootKind;
  shared: boolean;
};

export type DriveFolderDiscoveryResult = DriveFolder & {
  kind: 'folder';
};

export type DriveAudioDiscoveryResult = DriveDiscoveredAudioSource & {
  kind: 'audio';
};

export type DriveDiscoveryResult =
  | DriveFolderDiscoveryResult
  | DriveAudioDiscoveryResult;

export type DriveBrowseSnapshot = {
  location: DriveBrowseLocation;
  folders: DriveFolder[];
  playableSources: DriveDiscoveredAudioSource[];
  unavailableSources: DriveDiscoveredAudioSource[];
};

export type DriveSearchSnapshot = {
  query: string;
  results: DriveDiscoveryResult[];
  playableSources: DriveDiscoveredAudioSource[];
  unavailableSources: DriveDiscoveredAudioSource[];
};

export const isDriveFolder = (file: DriveFileMetadata) => {
  return file.mimeType === DRIVE_FOLDER_MIME_TYPE;
};

export const sortByName = <Entity extends { name: string }>(
  values: Entity[],
) => {
  values.sort((leftValue, rightValue) => {
    return leftValue.name.localeCompare(rightValue.name, undefined, {
      sensitivity: 'base',
      numeric: true,
    });
  });

  return values;
};

export const partitionSources = <Source extends DriveAudioSource>(
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

export const mapDriveFileToDiscoveredSource = (
  file: DriveFileMetadata,
  supportedMimeTypes: string[],
  supportedExtensions: string[],
  resolvedPath?: DriveResolvedPath,
): DriveDiscoveredAudioSource => {
  const source = mapDriveFileToAudioSource(
    file,
    supportedMimeTypes,
    supportedExtensions,
  );

  if (!resolvedPath) {
    return source;
  }

  return {
    ...source,
    locationLabel: createDrivePathLabel(resolvedPath),
    path: resolvedPath.path,
    rootKind: resolvedPath.rootKind,
  };
};

export const mapDriveFileToFolder = (
  file: DriveFileMetadata,
  rootKind: DriveBrowseRootKind,
  resolvedPath?: DriveResolvedPath,
): DriveFolder => {
  return {
    id: file.id,
    ...(resolvedPath
      ? {
          locationLabel: createDrivePathLabel(resolvedPath),
          path: resolvedPath.path,
        }
      : {}),
    name: file.name,
    modifiedTime: file.modifiedTime,
    rootKind: resolvedPath?.rootKind ?? rootKind,
    shared: file.shared ?? (resolvedPath?.rootKind ?? rootKind) === 'shared',
  };
};

export const createDrivePathLabel = (resolvedPath: DriveResolvedPath) => {
  const rootLabel =
    resolvedPath.rootKind === 'shared' ? 'Shared with you' : 'My Drive';

  return [rootLabel, ...resolvedPath.path.map(({ name }) => name)].join(' / ');
};

export const parseDriveLibrarySnapshot = async (
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

export const parseDriveBrowseSnapshot = (
  files: DriveFileMetadata[],
  options: {
    location: DriveBrowseLocation;
    resolvedPaths?: ReadonlyMap<string, DriveResolvedPath>;
    supportedMimeTypes: string[];
    supportedExtensions: string[];
  },
) => {
  const folders: DriveFolder[] = [];
  const sources: DriveDiscoveredAudioSource[] = [];

  for (const file of files) {
    const resolvedPath = options.resolvedPaths?.get(file.id);

    if (isDriveFolder(file)) {
      folders.push(mapDriveFileToFolder(file, options.location.rootKind));
      continue;
    }

    sources.push(
      mapDriveFileToDiscoveredSource(
        file,
        options.supportedMimeTypes,
        options.supportedExtensions,
        resolvedPath,
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

export const parseDriveSearchSnapshot = (
  files: DriveFileMetadata[],
  options: {
    query: string;
    location?: DriveBrowseLocation;
    resolvedPaths?: ReadonlyMap<string, DriveResolvedPath>;
    supportedMimeTypes: string[];
    supportedExtensions: string[];
  },
) => {
  const folders: DriveFolderDiscoveryResult[] = [];
  const sources: DriveDiscoveredAudioSource[] = [];

  for (const file of files) {
    const resolvedPath = options.resolvedPaths?.get(file.id);

    if (isDriveFolder(file)) {
      folders.push({
        ...mapDriveFileToFolder(
          file,
          options.location?.rootKind ?? (file.shared ? 'shared' : 'my-drive'),
          resolvedPath,
        ),
        kind: 'folder',
      });
      continue;
    }

    sources.push(
      mapDriveFileToDiscoveredSource(
        file,
        options.supportedMimeTypes,
        options.supportedExtensions,
        resolvedPath,
      ),
    );
  }

  const { playableSources, unavailableSources } = partitionSources(
    sortByName(sources),
  );
  const results: DriveDiscoveryResult[] = [
    ...folders,
    ...playableSources.map((source) => ({
      ...source,
      kind: 'audio' as const,
    })),
  ];

  return {
    query: options.query,
    results: sortByName(results),
    playableSources,
    unavailableSources,
  } satisfies DriveSearchSnapshot;
};

export const createEmptyDriveSearchSnapshot = (
  query: string,
): DriveSearchSnapshot => {
  return {
    query,
    results: [],
    playableSources: [],
    unavailableSources: [],
  };
};
