import AsyncStorage from '@react-native-async-storage/async-storage';

import type { DriveSaveFolder } from './folder-mode-model';

type SaveFolderStorage = Pick<
  typeof AsyncStorage,
  'getItem' | 'removeItem' | 'setItem'
>;

export const SAVE_FOLDER_KEY = 'choirlms.sheet-music.save-folder';

const isRecord = (value: unknown): value is Record<string, unknown> => {
  return typeof value === 'object' && value !== null;
};

const parseSaveFolder = (value: unknown): DriveSaveFolder | undefined => {
  if (
    !isRecord(value) ||
    (value.rootKind !== 'my-drive' && value.rootKind !== 'shared') ||
    !Array.isArray(value.path)
  ) {
    return undefined;
  }

  const path = value.path.flatMap((segment: unknown) => {
    return isRecord(segment) &&
      typeof segment.id === 'string' &&
      typeof segment.name === 'string'
      ? [{ id: segment.id, name: segment.name }]
      : [];
  });

  // A path with a bad segment is dropped whole: reopening at part of it would
  // land in the wrong folder.
  return path.length === value.path.length
    ? { path, rootKind: value.rootKind }
    : undefined;
};

/** The folder last saved to, or undefined when none is stored or it is unreadable. */
export const restoreSaveFolder = async (
  storage: SaveFolderStorage = AsyncStorage,
): Promise<DriveSaveFolder | undefined> => {
  try {
    const stored = await storage.getItem(SAVE_FOLDER_KEY);

    return stored === null ? undefined : parseSaveFolder(JSON.parse(stored));
  } catch {
    return undefined;
  }
};

export const rememberSaveFolder = async (
  folder: DriveSaveFolder,
  storage: SaveFolderStorage = AsyncStorage,
): Promise<void> => {
  try {
    await storage.setItem(SAVE_FOLDER_KEY, JSON.stringify(folder));
  } catch {
    // The choice still applies for this session.
  }
};
