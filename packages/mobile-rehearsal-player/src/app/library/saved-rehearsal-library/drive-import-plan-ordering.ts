import type {
  DriveImportFolderIntent,
  DriveImportTrackIntent,
} from './drive-import-planner';

const compareText = (leftValue: string, rightValue: string) => {
  const normalizedComparison = leftValue.localeCompare(rightValue, undefined, {
    numeric: true,
    sensitivity: 'base',
  });

  return normalizedComparison || leftValue.localeCompare(rightValue);
};

const comparePath = (leftPath: string[], rightPath: string[]) => {
  const sharedLength = Math.min(leftPath.length, rightPath.length);

  for (let index = 0; index < sharedLength; index += 1) {
    const comparison = compareText(
      leftPath[index] ?? '',
      rightPath[index] ?? '',
    );

    if (comparison !== 0) {
      return comparison;
    }
  }

  return leftPath.length - rightPath.length;
};

export const resolveDriveImportFolderPaths = (
  folders: readonly DriveImportFolderIntent[],
) => {
  const foldersById = new Map(
    folders.map((intent) => [intent.folder.id, intent] as const),
  );
  const pathsById = new Map<string, string[]>();

  const resolvePath = (intent: DriveImportFolderIntent): string[] => {
    const cachedPath = pathsById.get(intent.folder.id);

    if (cachedPath) {
      return cachedPath;
    }

    const path =
      intent.parent.kind === 'planned-folder'
        ? [
            ...resolvePath(
              foldersById.get(intent.parent.driveFolderId) ?? intent,
            ),
            intent.folder.name,
          ]
        : [intent.folder.name];

    pathsById.set(intent.folder.id, path);
    return path;
  };

  for (const folder of folders) {
    resolvePath(folder);
  }

  return pathsById;
};

export const sortDriveImportFolders = (
  folders: readonly DriveImportFolderIntent[],
  pathsById: ReadonlyMap<string, string[]>,
) => {
  return [...folders].sort((leftIntent, rightIntent) => {
    return (
      comparePath(
        pathsById.get(leftIntent.folder.id) ?? [],
        pathsById.get(rightIntent.folder.id) ?? [],
      ) || compareText(leftIntent.folder.id, rightIntent.folder.id)
    );
  });
};

const resolveTrackPath = (
  intent: DriveImportTrackIntent,
  folderPathsById: ReadonlyMap<string, string[]>,
) => {
  const parentFolderId =
    'parentFolderId' in intent.source &&
    typeof intent.source.parentFolderId === 'string'
      ? intent.source.parentFolderId
      : undefined;

  return [
    ...(parentFolderId
      ? (folderPathsById.get(parentFolderId) ?? [])
      : (intent.source.path?.map(({ name }) => name) ?? [])),
    intent.source.name,
  ];
};

export const sortDriveImportTracks = (
  tracks: readonly DriveImportTrackIntent[],
  folderPathsById: ReadonlyMap<string, string[]>,
) => {
  return [...tracks].sort((leftIntent, rightIntent) => {
    const leftPath = resolveTrackPath(leftIntent, folderPathsById);
    const rightPath = resolveTrackPath(rightIntent, folderPathsById);

    return (
      comparePath(leftPath, rightPath) ||
      compareText(leftIntent.source.driveFileId, rightIntent.source.driveFileId)
    );
  });
};
