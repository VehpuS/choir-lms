import AsyncStorage from '@react-native-async-storage/async-storage';

type LyricsPreferencesStorage = Pick<
  typeof AsyncStorage,
  'getItem' | 'setItem'
>;

export const LYRICS_LOOKUP_DISCLOSURE_KEY =
  'choirlms.lyrics.lookup-disclosure-acknowledged';
const ACKNOWLEDGED_VALUE = 'true';

/** Whether the user has seen what a lookup sends, remembered per device. */
export const restoreLyricsLookupDisclosureAcknowledged = async (
  storage: LyricsPreferencesStorage = AsyncStorage,
): Promise<boolean> => {
  try {
    return (
      (await storage.getItem(LYRICS_LOOKUP_DISCLOSURE_KEY)) ===
      ACKNOWLEDGED_VALUE
    );
  } catch {
    return false;
  }
};

export const persistLyricsLookupDisclosureAcknowledged = async (
  storage: LyricsPreferencesStorage = AsyncStorage,
): Promise<void> => {
  try {
    await storage.setItem(LYRICS_LOOKUP_DISCLOSURE_KEY, ACKNOWLEDGED_VALUE);
  } catch {
    // The disclosure is shown again next time; nothing else depends on it.
  }
};
