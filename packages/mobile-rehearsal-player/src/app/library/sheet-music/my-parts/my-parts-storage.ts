import AsyncStorage from '@react-native-async-storage/async-storage';
import {
  VOICE_SECTION_LABELS,
  parseVoiceSection,
  sanitizePartPreferences,
} from '@org/audio-library-models';

import {
  DEFAULT_MY_PARTS_PREFERENCES,
  type MyPartsPreferences,
} from './my-parts-model';

type MyPartsStorage = Pick<
  typeof AsyncStorage,
  'getItem' | 'removeItem' | 'setItem'
>;

export const MY_PARTS_KEY = 'choirlms.sheet-music.my-parts';
export const LATEST_PART_KEY = 'choirlms.sheet-music.latest-part';
// The first version stored one voice section under each of these.
export const LEGACY_DEFAULT_VOICE_KEY = 'choirlms.sheet-music.default-voice';
export const LEGACY_LATEST_VOICE_KEY = 'choirlms.sheet-music.latest-voice';

const parseParts = (stored: string | null): string[] => {
  if (stored === null) {
    return [];
  }

  try {
    return sanitizePartPreferences(JSON.parse(stored));
  } catch {
    return [];
  }
};

const legacyVoiceName = (stored: string | null): string | undefined => {
  const section = parseVoiceSection(stored);

  return section === undefined ? undefined : VOICE_SECTION_LABELS[section];
};

/** Reads the list and the latest part, carrying over the first version's keys. */
export const restoreMyPartsPreferences = async (
  storage: MyPartsStorage = AsyncStorage,
): Promise<MyPartsPreferences> => {
  try {
    const [parts, latest, legacyDefault, legacyLatest] = await Promise.all([
      storage.getItem(MY_PARTS_KEY),
      storage.getItem(LATEST_PART_KEY),
      storage.getItem(LEGACY_DEFAULT_VOICE_KEY),
      storage.getItem(LEGACY_LATEST_VOICE_KEY),
    ]);
    const restored: MyPartsPreferences = {
      latestPart: sanitizePartPreferences([
        latest ?? legacyVoiceName(legacyLatest),
      ])[0],
      parts:
        parts === null
          ? sanitizePartPreferences([legacyVoiceName(legacyDefault)])
          : parseParts(parts),
    };

    if (legacyDefault !== null || legacyLatest !== null) {
      await persistMyPartsPreferences(restored, storage);
      await Promise.all([
        storage.removeItem(LEGACY_DEFAULT_VOICE_KEY),
        storage.removeItem(LEGACY_LATEST_VOICE_KEY),
      ]);
    }

    return restored;
  } catch {
    return DEFAULT_MY_PARTS_PREFERENCES;
  }
};

export const persistMyPartsPreferences = async (
  preferences: MyPartsPreferences,
  storage: MyPartsStorage = AsyncStorage,
): Promise<void> => {
  try {
    await Promise.all([
      storage.setItem(MY_PARTS_KEY, JSON.stringify(preferences.parts)),
      preferences.latestPart === undefined
        ? storage.removeItem(LATEST_PART_KEY)
        : storage.setItem(LATEST_PART_KEY, preferences.latestPart),
    ]);
  } catch {
    // The choice still applies for this session.
  }
};
