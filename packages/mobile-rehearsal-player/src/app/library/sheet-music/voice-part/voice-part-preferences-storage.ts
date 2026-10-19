import AsyncStorage from '@react-native-async-storage/async-storage';
import { parseVoiceSection } from '@org/audio-library-models';

import {
  DEFAULT_VOICE_PART_PREFERENCES,
  type VoicePartPreferences,
} from './voice-part-preferences';

type VoicePartStorage = Pick<
  typeof AsyncStorage,
  'getItem' | 'removeItem' | 'setItem'
>;

export const DEFAULT_VOICE_KEY = 'choirlms.sheet-music.default-voice';
export const LATEST_VOICE_KEY = 'choirlms.sheet-music.latest-voice';

export const restoreVoicePartPreferences = async (
  storage: VoicePartStorage = AsyncStorage,
): Promise<VoicePartPreferences> => {
  try {
    const [defaultVoice, latestVoice] = await Promise.all([
      storage.getItem(DEFAULT_VOICE_KEY),
      storage.getItem(LATEST_VOICE_KEY),
    ]);

    return {
      defaultVoice: parseVoiceSection(defaultVoice),
      latestVoice: parseVoiceSection(latestVoice),
    };
  } catch {
    return DEFAULT_VOICE_PART_PREFERENCES;
  }
};

const writeKey = async (
  storage: VoicePartStorage,
  key: string,
  value: string | undefined,
) => {
  if (value === undefined) {
    await storage.removeItem(key);
  } else {
    await storage.setItem(key, value);
  }
};

export const persistVoicePartPreferences = async (
  preferences: VoicePartPreferences,
  storage: VoicePartStorage = AsyncStorage,
): Promise<void> => {
  try {
    await Promise.all([
      writeKey(storage, DEFAULT_VOICE_KEY, preferences.defaultVoice),
      writeKey(storage, LATEST_VOICE_KEY, preferences.latestVoice),
    ]);
  } catch {
    // The choice still applies for this session.
  }
};
