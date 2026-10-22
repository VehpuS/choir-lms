import {
  MY_DRIVE_ROOT_LOCATION,
  SHARED_FOLDERS_ROOT_LOCATION,
  type DriveBrowseLocation,
} from '@org/google-drive';

import {
  currentDrivePickerLocation,
  type DrivePickerNavigation,
} from './model';

export const FOLDER_PICKER_TITLE = 'Choose a Drive folder';
export const FOLDER_PICKER_NOTE =
  'The file is added to the folder you choose here. You can pick any folder you can add files to.';
export const FOLDER_PICKER_SHARED_ROOT_MESSAGE =
  'Open a shared folder, or switch to My Drive, to choose where to save.';
export const FOLDER_PICKER_EMPTY_MESSAGE = 'No folders here.';
export const SAVE_HERE_LABEL = 'Save here';

/** A folder as a path of folders from its root, the shape the track stores. */
export type DriveSaveFolder = {
  path: ReadonlyArray<{ id: string; name: string }>;
  rootKind: DriveBrowseLocation['rootKind'];
};

const rootFor = (rootKind: DriveBrowseLocation['rootKind']) => {
  return rootKind === 'shared'
    ? SHARED_FOLDERS_ROOT_LOCATION
    : MY_DRIVE_ROOT_LOCATION;
};

const toNavigation = (folder: DriveSaveFolder): DrivePickerNavigation => ({
  stack: [
    rootFor(folder.rootKind),
    ...folder.path.map(
      ({ id, name }): DriveBrowseLocation => ({
        id,
        kind: 'folder',
        name,
        rootKind: folder.rootKind,
      }),
    ),
  ],
});

/**
 * Where the folder picker opens: the track's own Drive folder when it has one
 * (the likeliest home for its score), else the folder last saved to, else My
 * Drive.
 */
export const createFolderPickerNavigation = (options: {
  remembered?: DriveSaveFolder;
  trackFolder?: DriveSaveFolder;
}): DrivePickerNavigation => {
  const folder = options.trackFolder ?? options.remembered;

  return folder ? toNavigation(folder) : { stack: [MY_DRIVE_ROOT_LOCATION] };
};

/** `Save here` works in My Drive and any folder, but not at the Shared root. */
export const canSaveHere = (navigation: DrivePickerNavigation): boolean => {
  const location = currentDrivePickerLocation(navigation);

  return !(location.kind === 'root' && location.rootKind === 'shared');
};

/** The folder `Save here` would save into, or undefined where it is not allowed. */
export const resolveSaveTarget = (
  navigation: DrivePickerNavigation,
): { folderId: string; folderName: string } | undefined => {
  if (!canSaveHere(navigation)) {
    return undefined;
  }

  const location = currentDrivePickerLocation(navigation);

  return { folderId: location.id, folderName: location.name };
};

/** The place to remember after a save, as the path the picker reopens at. */
export const toSaveFolder = (
  navigation: DrivePickerNavigation,
): DriveSaveFolder => {
  const [root, ...folders] = navigation.stack;

  return {
    path: folders.map(({ id, name }) => ({ id, name })),
    rootKind: root?.rootKind ?? 'my-drive',
  };
};
