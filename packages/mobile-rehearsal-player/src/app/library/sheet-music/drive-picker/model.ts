import {
  MY_DRIVE_ROOT_LOCATION,
  SHARED_FOLDERS_ROOT_LOCATION,
  type DriveBrowseLocation,
  type DriveSheetMusicFile,
} from '@org/google-drive';

import { suggestLabelFromFileName } from '../manager/model';

export const DRIVE_PICKER_NOTE =
  'Only PDF, MusicXML, MIDI, and MuseScore files are shown.';
export const DRIVE_ACCESS_MESSAGE =
  'Drive access is needed to choose a file. Reconnect, then try again.';
export const DRIVE_UNAVAILABLE_MESSAGE =
  'Google Drive could not be reached. Check your connection and try again.';
export const DRIVE_EMPTY_FOLDER_MESSAGE =
  'No sheet music in this folder. Open a folder or search by name.';
export const DRIVE_MORE_RESULTS_MESSAGE =
  'Showing the first matches. Type more of the name to narrow the list.';
export const DRIVE_EMPTY_SEARCH_MESSAGE = 'No sheet music matches that name.';

export type DrivePickerFailure = 'needs-drive-access' | 'unavailable';

// The shared root is titled `Shared folders` elsewhere; the picker names it
// after its button so the title matches what was pressed.
export const DRIVE_PICKER_ROOTS: readonly DriveBrowseLocation[] = [
  MY_DRIVE_ROOT_LOCATION,
  { ...SHARED_FOLDERS_ROOT_LOCATION, name: 'Shared with you' },
];

export const DRIVE_PICKER_FAILURE_COPY: Record<DrivePickerFailure, string> = {
  'needs-drive-access': DRIVE_ACCESS_MESSAGE,
  unavailable: DRIVE_UNAVAILABLE_MESSAGE,
};

const UNAUTHORIZED_PATTERN = /\b(401|403)\b/;

/** Maps a failed Drive request to what the picker says and offers. */
export const classifyDrivePickerFailure = (
  error: unknown,
): DrivePickerFailure => {
  return error instanceof Error && UNAUTHORIZED_PATTERN.test(error.message)
    ? 'needs-drive-access'
    : 'unavailable';
};

export type DrivePickerNavigation = {
  /** The folders opened so far, starting at a root; the last one is shown. */
  stack: readonly DriveBrowseLocation[];
};

export const createDrivePickerNavigation = (
  root: DriveBrowseLocation = MY_DRIVE_ROOT_LOCATION,
): DrivePickerNavigation => ({ stack: [root] });

export const currentDrivePickerLocation = (
  navigation: DrivePickerNavigation,
): DriveBrowseLocation => {
  return (
    navigation.stack[navigation.stack.length - 1] ?? MY_DRIVE_ROOT_LOCATION
  );
};

export const openDrivePickerFolder = (
  navigation: DrivePickerNavigation,
  folder: {
    id: string;
    name: string;
    rootKind: DriveBrowseLocation['rootKind'];
  },
): DrivePickerNavigation => ({
  stack: [
    ...navigation.stack,
    {
      id: folder.id,
      kind: 'folder',
      name: folder.name,
      rootKind: folder.rootKind,
    },
  ],
});

export const canGoUpInDrivePicker = (
  navigation: DrivePickerNavigation,
): boolean => navigation.stack.length > 1;

export const goUpInDrivePicker = (
  navigation: DrivePickerNavigation,
): DrivePickerNavigation => {
  return canGoUpInDrivePicker(navigation)
    ? { stack: navigation.stack.slice(0, -1) }
    : navigation;
};

/** The place the picker is showing, for example `My Drive / Scores`. */
export const describeDrivePickerLocation = (
  navigation: DrivePickerNavigation,
): string => navigation.stack.map(({ name }) => name).join(' / ');

export type DrivePickerSearchScope = 'everywhere' | 'folder';

/**
 * Where a name search runs. It follows the folder being browsed, and the
 * singer can widen it to all of Drive; opening another folder resets it. At a
 * root there is no folder to follow, so it always covers all of Drive.
 */
export const resolveDrivePickerSearchScope = (
  navigation: DrivePickerNavigation,
  isWidened: boolean,
): DrivePickerSearchScope => {
  return canGoUpInDrivePicker(navigation) && !isWidened
    ? 'folder'
    : 'everywhere';
};

/** The name of the folder a folder search runs in, or undefined at a root. */
export const getDrivePickerSearchFolderName = (
  navigation: DrivePickerNavigation,
): string | undefined => {
  return canGoUpInDrivePicker(navigation)
    ? currentDrivePickerLocation(navigation).name
    : undefined;
};

export const describeDrivePickerSearchPlaceholder = (
  scope: DrivePickerSearchScope,
  folderName: string | undefined,
): string => {
  return scope === 'folder' && folderName
    ? `Search in ${folderName}`
    : 'Search Drive by name';
};

/** The line above search results, saying what was searched. */
export const describeDrivePickerResultsLine = (
  query: string,
  scope: DrivePickerSearchScope,
  folderName: string | undefined,
): string => {
  const where =
    scope === 'folder' && folderName
      ? `${folderName} and its subfolders`
      : 'all of Drive';

  return `Results for “${query}” in ${where}`;
};

/** What the manager adds for a chosen Drive file. */
export const createDriveAddition = (file: DriveSheetMusicFile) => {
  return {
    format: file.format,
    label: suggestLabelFromFileName(file.name),
    location: { fileId: file.id, kind: 'drive' as const, name: file.name },
  };
};

export type DriveAddition = ReturnType<typeof createDriveAddition>;
