import AsyncStorage from '@react-native-async-storage/async-storage';

import {
  parseMicrophoneChoice,
  serializeMicrophoneChoice,
  type MicrophoneChoice,
} from './microphone-choice-model';

type ChoiceStorage = Pick<
  typeof AsyncStorage,
  'getItem' | 'removeItem' | 'setItem'
>;

export const MICROPHONE_CHOICE_KEY = 'choirlms.pitch.microphone-choice';

/** The remembered microphone, per device; `null` asks each time. */
export const restoreMicrophoneChoice = async (
  storage: ChoiceStorage = AsyncStorage,
): Promise<MicrophoneChoice | null> => {
  try {
    return parseMicrophoneChoice(await storage.getItem(MICROPHONE_CHOICE_KEY));
  } catch {
    return null;
  }
};

export const persistMicrophoneChoice = async (
  choice: MicrophoneChoice | null,
  storage: ChoiceStorage = AsyncStorage,
): Promise<void> => {
  try {
    const serialized = serializeMicrophoneChoice(choice);

    if (serialized === null) {
      await storage.removeItem(MICROPHONE_CHOICE_KEY);
      return;
    }

    await storage.setItem(MICROPHONE_CHOICE_KEY, serialized);
  } catch {
    // The prompt appears again next time; nothing else depends on the choice.
  }
};
