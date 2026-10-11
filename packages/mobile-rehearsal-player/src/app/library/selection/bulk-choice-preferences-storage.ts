import AsyncStorage from '@react-native-async-storage/async-storage';

import {
  DEFAULT_BULK_CHOICE_PREFERENCES,
  type BulkChoicePreferences,
  type PlaylistsInFoldersPreference,
  type RepeatedItemsPreference,
} from './bulk-choices';

type BulkChoicePreferencesStorage = Pick<
  typeof AsyncStorage,
  'getItem' | 'removeItem' | 'setItem'
>;

export const BULK_CHOICE_PREFERENCES_KEY = 'choirlms.selection.bulk-choices';

const PLAYLISTS_PREFERENCES: readonly PlaylistsInFoldersPreference[] = [
  'ask',
  'include',
  'skip',
];
const REPEATS_PREFERENCES: readonly RepeatedItemsPreference[] = [
  'ask',
  'keep',
  'remove',
];

// Each field is validated on its own so one corrupt value falls back to
// `ask` without discarding the other stored default.
const pickKnown = <T extends string>(
  value: unknown,
  known: readonly T[],
  fallback: T,
): T => (known.includes(value as T) ? (value as T) : fallback);

const normalizeBulkChoicePreferences = (
  value: unknown,
): BulkChoicePreferences => {
  if (typeof value !== 'object' || value === null) {
    return DEFAULT_BULK_CHOICE_PREFERENCES;
  }

  const record = value as Record<string, unknown>;

  return {
    playlistsInFolders: pickKnown(
      record.playlistsInFolders,
      PLAYLISTS_PREFERENCES,
      DEFAULT_BULK_CHOICE_PREFERENCES.playlistsInFolders,
    ),
    repeatedItems: pickKnown(
      record.repeatedItems,
      REPEATS_PREFERENCES,
      DEFAULT_BULK_CHOICE_PREFERENCES.repeatedItems,
    ),
  };
};

export const restoreBulkChoicePreferences = async (
  storage: BulkChoicePreferencesStorage = AsyncStorage,
): Promise<BulkChoicePreferences> => {
  const storedValue = await storage.getItem(BULK_CHOICE_PREFERENCES_KEY);

  if (!storedValue) {
    return DEFAULT_BULK_CHOICE_PREFERENCES;
  }

  try {
    return normalizeBulkChoicePreferences(JSON.parse(storedValue) as unknown);
  } catch {
    return DEFAULT_BULK_CHOICE_PREFERENCES;
  }
};

export const persistBulkChoicePreferences = async (
  preferences: BulkChoicePreferences,
  storage: BulkChoicePreferencesStorage = AsyncStorage,
) => {
  await storage.setItem(
    BULK_CHOICE_PREFERENCES_KEY,
    JSON.stringify(normalizeBulkChoicePreferences(preferences)),
  );
};

/** Clears both stored defaults so every question is asked again. */
export const resetBulkChoicePreferences = async (
  storage: BulkChoicePreferencesStorage = AsyncStorage,
) => {
  await storage.removeItem(BULK_CHOICE_PREFERENCES_KEY);
};
