import AsyncStorage from '@react-native-async-storage/async-storage';
import { useSyncExternalStore } from 'react';

import type { AutoExportSettings } from './auto-export-model';
import {
  DEFAULT_AUTO_EXPORT_SETTINGS,
  applyAutoExportChange,
  parseAutoExportSettings,
  type AutoExportChange,
} from './auto-export-settings';

export const AUTO_EXPORT_SETTINGS_KEY = 'choirlms.recording-export.settings';

type SettingsStorage = Pick<typeof AsyncStorage, 'getItem' | 'setItem'>;

export type AutoExportSettingsStore = {
  get: () => AutoExportSettings;
  /** Loads the saved settings; a change made while it was pending wins. */
  restore: () => Promise<void>;
  change: (change: AutoExportChange, now?: Date) => Promise<void>;
  subscribe: (listener: () => void) => () => void;
};

export const createAutoExportSettingsStore = (
  storage: SettingsStorage,
): AutoExportSettingsStore => {
  let current = DEFAULT_AUTO_EXPORT_SETTINGS;
  let hasChanged = false;
  const listeners = new Set<() => void>();
  const publish = (next: AutoExportSettings) => {
    current = next;
    listeners.forEach((listener) => listener());
  };

  return {
    get: () => current,
    restore: async () => {
      try {
        const stored = await storage.getItem(AUTO_EXPORT_SETTINGS_KEY);

        if (!hasChanged && stored !== null) {
          publish(parseAutoExportSettings(JSON.parse(stored)));
        }
      } catch {
        // The defaults apply when nothing can be read.
      }
    },
    change: async (change, now = new Date()) => {
      hasChanged = true;

      const next = applyAutoExportChange(current, change, now);

      if (next !== current) {
        publish(next);
      }

      try {
        await storage.setItem(AUTO_EXPORT_SETTINGS_KEY, JSON.stringify(next));
      } catch {
        // The choice still applies for this session.
      }
    },
    subscribe: (listener) => {
      listeners.add(listener);

      return () => {
        listeners.delete(listener);
      };
    },
  };
};

export const autoExportSettingsStore =
  createAutoExportSettingsStore(AsyncStorage);

void autoExportSettingsStore.restore();

export const useAutoExportSettings = (): AutoExportSettings =>
  useSyncExternalStore(
    autoExportSettingsStore.subscribe,
    autoExportSettingsStore.get,
    () => DEFAULT_AUTO_EXPORT_SETTINGS,
  );
