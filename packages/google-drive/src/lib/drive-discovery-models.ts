import type { DriveAudioSource } from '@org/audio-library-models';

import {
  mapDriveFileToAudioSource,
  type DriveFileMetadata,
} from './google-drive-core';

export const DRIVE_FOLDER_MIME_TYPE = 'application/vnd.google-apps.folder';

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

export const createSearchLocationLabel = (file: DriveFileMetadata) => {
  return file.shared ? 'Shared with you' : 'My Drive';
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
    supportedMimeTypes: string[];
    supportedExtensions: string[];
  },
) => {
  const folders: DriveFolder[] = [];
  const sources: DriveDiscoveredAudioSource[] = [];

  for (const file of files) {
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

export const parseDriveSearchSnapshot = (
  files: DriveFileMetadata[],
  options: {
    query: string;
    supportedMimeTypes: string[];
    supportedExtensions: string[];
  },
) => {
  const sources: DriveDiscoveredAudioSource[] = [];

  for (const file of files) {
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

export const createEmptyDriveSearchSnapshot = (
  query: string,
): DriveSearchSnapshot => {
  return {
    query,
    playableSources: [],
    unavailableSources: [],
  };
};
