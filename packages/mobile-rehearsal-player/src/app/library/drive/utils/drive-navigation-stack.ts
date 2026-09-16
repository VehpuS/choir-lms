import {
  MY_DRIVE_ROOT_LOCATION,
  SHARED_FOLDERS_ROOT_LOCATION,
  type DriveBrowseLocation,
  type DriveFolder,
} from '@org/google-drive';

const createFolderLocation = (
  folder: Pick<DriveFolder, 'id' | 'name' | 'rootKind'>,
): DriveBrowseLocation => {
  return {
    id: folder.id,
    kind: 'folder',
    name: folder.name,
    rootKind: folder.rootKind,
  };
};

export const buildDriveFolderNavigationStack = (options: {
  currentStack: DriveBrowseLocation[];
  folder: DriveFolder;
}): DriveBrowseLocation[] => {
  if (!options.folder.path) {
    return [...options.currentStack, createFolderLocation(options.folder)];
  }

  const rootLocation =
    options.folder.rootKind === 'shared'
      ? SHARED_FOLDERS_ROOT_LOCATION
      : MY_DRIVE_ROOT_LOCATION;
  const ancestorLocations = options.folder.path
    .filter((segment) => {
      return segment.id !== options.folder.id;
    })
    .map((segment) => {
      return createFolderLocation({
        ...segment,
        rootKind: options.folder.rootKind,
      });
    });

  return [
    { ...rootLocation },
    ...ancestorLocations,
    createFolderLocation(options.folder),
  ];
};
