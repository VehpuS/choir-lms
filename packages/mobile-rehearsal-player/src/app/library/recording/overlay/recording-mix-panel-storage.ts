import AsyncStorage from '@react-native-async-storage/async-storage';

import {
  MIX_PANEL_STORAGE_KEY,
  parseMixPanelOpen,
  serializeMixPanelOpen,
} from './recording-mix-panel-model';

export type MixPanelStorage = Pick<typeof AsyncStorage, 'getItem' | 'setItem'>;

/** Whether the row was left open on this device; open when nothing is stored or storage fails. */
export const readMixPanelOpen = async (
  storage: MixPanelStorage = AsyncStorage,
): Promise<boolean> => {
  try {
    return parseMixPanelOpen(await storage.getItem(MIX_PANEL_STORAGE_KEY));
  } catch {
    return true;
  }
};

export const saveMixPanelOpen = async (
  isOpen: boolean,
  storage: MixPanelStorage = AsyncStorage,
): Promise<void> => {
  try {
    await storage.setItem(MIX_PANEL_STORAGE_KEY, serializeMixPanelOpen(isOpen));
  } catch {
    // The row still works; it just starts open next time.
  }
};
