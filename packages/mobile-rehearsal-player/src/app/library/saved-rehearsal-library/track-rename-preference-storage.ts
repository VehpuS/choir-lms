import AsyncStorage from '@react-native-async-storage/async-storage';

import type { TrackRenameCopiesChoice } from './track-rename-model';

type TrackRenamePreferenceStorage = Pick<
  typeof AsyncStorage,
  'getItem' | 'removeItem' | 'setItem'
>;

export const TRACK_RENAME_COPIES_CHOICE_KEY =
  'choirlms.library.track-rename-copies-choice';
const ALL_COPIES_VALUE = 'all';
const THIS_COPY_VALUE = 'this';

/** The remembered answer to "rename all copies, or just this one?", per device. */
export const restoreTrackRenameCopiesChoice = async (
  storage: TrackRenamePreferenceStorage = AsyncStorage,
): Promise<TrackRenameCopiesChoice | null> => {
  try {
    const stored = await storage.getItem(TRACK_RENAME_COPIES_CHOICE_KEY);

    return stored === ALL_COPIES_VALUE || stored === THIS_COPY_VALUE
      ? stored
      : null;
  } catch {
    return null;
  }
};

export const persistTrackRenameCopiesChoice = async (
  choice: TrackRenameCopiesChoice | null,
  storage: TrackRenamePreferenceStorage = AsyncStorage,
): Promise<void> => {
  try {
    if (choice === null) {
      await storage.removeItem(TRACK_RENAME_COPIES_CHOICE_KEY);
      return;
    }

    await storage.setItem(TRACK_RENAME_COPIES_CHOICE_KEY, choice);
  } catch {
    // The prompt appears again next time; nothing else depends on the choice.
  }
};
