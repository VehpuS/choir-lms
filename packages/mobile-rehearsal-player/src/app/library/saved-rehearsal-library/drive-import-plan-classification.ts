import type {
  DriveAudioSource,
  RehearsalLibraryFileLinkNode,
  RehearsalLibraryFileTree,
} from '@org/audio-library-models';
import {
  resolveRehearsalLibraryAvailableNodeName,
  type RehearsalLibraryEntityCollections,
} from '@org/audio-library-runtime';

import {
  resolveDriveImportFolderPaths,
  sortDriveImportFolders,
  sortDriveImportTracks,
} from './drive-import-plan-ordering';
import type {
  DriveImportFolderIntent,
  DriveImportFolderTarget,
  DriveImportTrackIntent,
} from './drive-import-planner';

export type DriveImportLibraryState = {
  entityCollections: RehearsalLibraryEntityCollections;
  tree: RehearsalLibraryFileTree;
};

export type ClassifiedDriveImportFolderIntent = DriveImportFolderIntent & {
  libraryFolderId: string;
  name: string;
  status: 'create' | 'reuse';
};

export type DriveImportSourceClassification =
  | 'already-present'
  | 'new'
  | 'reusable';

export type ClassifiedDriveImportTrackIntent = DriveImportTrackIntent & {
  canonicalSourceId: string;
  classification: DriveImportSourceClassification;
  libraryFileLinkId: string;
  visibleName?: string;
};

export const createDriveImportLibraryFolderId = (
  driveFolderId: string,
  parentFolderId: string,
) => {
  return `folder:drive-import:${encodeURIComponent(parentFolderId)}:${encodeURIComponent(driveFolderId)}`;
};

const createDriveImportFileLinkId = (
  driveFileId: string,
  targetFolderId: string,
) => {
  return `file-link:drive-import:${encodeURIComponent(driveFileId)}:${encodeURIComponent(targetFolderId)}`;
};

const resolveTargetFolderId = (
  target: DriveImportFolderTarget,
  plannedFolderIds: ReadonlyMap<string, string>,
) => {
  return target.kind === 'library-folder'
    ? target.folderId
    : plannedFolderIds.get(target.driveFolderId);
};

const resolveEntityName = (
  collections: RehearsalLibraryEntityCollections,
  fileLink: RehearsalLibraryFileLinkNode,
) => {
  if (fileLink.visibleName) {
    return fileLink.visibleName;
  }

  if (fileLink.entityKind === 'track') {
    return (
      collections.sources.find(({ id }) => id === fileLink.entityId)?.name ??
      fileLink.entityId
    );
  }

  if (fileLink.entityKind === 'loop') {
    return (
      collections.loops.find(({ id }) => id === fileLink.entityId)?.name ??
      fileLink.entityId
    );
  }

  return (
    collections.playlists.find(({ id }) => id === fileLink.entityId)?.name ??
    fileLink.entityId
  );
};

const buildReservedNames = (libraryState: DriveImportLibraryState) => {
  const namesByFolderId = new Map<string, Set<string>>();
  const addName = (folderId: string, name: string) => {
    const names = namesByFolderId.get(folderId) ?? new Set<string>();
    names.add(name);
    namesByFolderId.set(folderId, names);
  };

  for (const folder of libraryState.tree.folders) {
    if (folder.parentFolderId) {
      addName(folder.parentFolderId, folder.name);
    }
  }

  for (const fileLink of libraryState.tree.fileLinks) {
    addName(
      fileLink.parentFolderId,
      resolveEntityName(libraryState.entityCollections, fileLink),
    );
  }

  return { addName, namesByFolderId };
};

export const classifyDriveImportIntents = (options: {
  folders: readonly DriveImportFolderIntent[];
  libraryState: DriveImportLibraryState;
  tracks: readonly DriveImportTrackIntent[];
}) => {
  const { addName, namesByFolderId } = buildReservedNames(options.libraryState);
  const existingFoldersById = new Map(
    options.libraryState.tree.folders.map((folder) => [folder.id, folder]),
  );
  const savedSourcesByDriveId = new Map(
    options.libraryState.entityCollections.sources.map((source) => [
      source.driveFileId,
      source,
    ]),
  );
  const folders: ClassifiedDriveImportFolderIntent[] = [];
  const folderPathsById = resolveDriveImportFolderPaths(options.folders);
  const plannedFolderIds = new Map<string, string>();

  for (const intent of sortDriveImportFolders(
    options.folders,
    folderPathsById,
  )) {
    const parentFolderId = resolveTargetFolderId(
      intent.parent,
      plannedFolderIds,
    );

    if (!parentFolderId) {
      throw new Error(
        `Drive folder ${intent.folder.id} has an unresolved planned parent.`,
      );
    }

    const libraryFolderId = createDriveImportLibraryFolderId(
      intent.folder.id,
      parentFolderId,
    );
    const existingFolder = existingFoldersById.get(libraryFolderId);
    const name = existingFolder
      ? existingFolder.name
      : resolveRehearsalLibraryAvailableNodeName({
          reservedNames: namesByFolderId.get(parentFolderId) ?? [],
          sourceName: intent.folder.name,
        });

    addName(parentFolderId, name);
    plannedFolderIds.set(intent.folder.id, libraryFolderId);
    folders.push({
      ...intent,
      libraryFolderId,
      name,
      status: existingFolder ? 'reuse' : 'create',
    });
  }

  const tracks: ClassifiedDriveImportTrackIntent[] = [];

  for (const intent of sortDriveImportTracks(options.tracks, folderPathsById)) {
    const targetFolderId = resolveTargetFolderId(
      intent.targetFolder,
      plannedFolderIds,
    );

    if (!targetFolderId) {
      throw new Error(
        `Drive file ${intent.source.driveFileId} has an unresolved planned folder.`,
      );
    }
    const savedSource: DriveAudioSource | undefined = savedSourcesByDriveId.get(
      intent.source.driveFileId,
    );
    const canonicalSourceId = savedSource?.id ?? intent.source.id;
    const existingLink = options.libraryState.tree.fileLinks.find(
      (fileLink) =>
        fileLink.entityKind === 'track' &&
        fileLink.entityId === canonicalSourceId &&
        fileLink.parentFolderId === targetFolderId,
    );
    const libraryFileLinkId =
      existingLink?.id ??
      createDriveImportFileLinkId(intent.source.driveFileId, targetFolderId);

    if (existingLink) {
      tracks.push({
        ...intent,
        canonicalSourceId,
        classification: 'already-present',
        libraryFileLinkId,
        ...(existingLink.visibleName
          ? { visibleName: existingLink.visibleName }
          : {}),
      });
      continue;
    }

    const visibleName = resolveRehearsalLibraryAvailableNodeName({
      reservedNames: namesByFolderId.get(targetFolderId) ?? [],
      sourceName: intent.source.name,
    });
    addName(targetFolderId, visibleName);
    tracks.push({
      ...intent,
      canonicalSourceId,
      classification: savedSource ? 'reusable' : 'new',
      libraryFileLinkId,
      ...(visibleName === intent.source.name ? {} : { visibleName }),
    });
  }

  return { folders, tracks };
};
