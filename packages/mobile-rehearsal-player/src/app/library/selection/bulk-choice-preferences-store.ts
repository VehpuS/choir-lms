import { useSyncExternalStore } from 'react';

import {
  DEFAULT_BULK_CHOICE_PREFERENCES,
  type BulkChoicePreferences,
} from './bulk-choices';
import {
  persistBulkChoicePreferences,
  resetBulkChoicePreferences,
  restoreBulkChoicePreferences,
} from './bulk-choice-preferences-storage';

// The prompt (anywhere in Library) and the Settings screen share one live
// copy of the stored defaults, so a change made in either shows in the other
// at once. A tiny external store keeps that without lifting state into the
// router (same pattern as the pinned bulk bar store).

type Listener = () => void;

type PreferenceStorage = Parameters<typeof restoreBulkChoicePreferences>[0];

export type BulkChoicePreferencesStore = {
  getSnapshot: () => BulkChoicePreferences;
  /** Reads the stored defaults once; later calls share the same read. */
  hydrate: () => Promise<BulkChoicePreferences>;
  reset: () => Promise<void>;
  subscribe: (listener: Listener) => () => void;
  update: (change: Partial<BulkChoicePreferences>) => Promise<void>;
};

export const createBulkChoicePreferencesStore = (
  storage?: PreferenceStorage,
): BulkChoicePreferencesStore => {
  let current: BulkChoicePreferences = DEFAULT_BULK_CHOICE_PREFERENCES;
  let hydration: Promise<BulkChoicePreferences> | null = null;
  const listeners = new Set<Listener>();

  const publish = (next: BulkChoicePreferences) => {
    current = next;
    listeners.forEach((listener) => {
      listener();
    });
  };

  const hydrate = () => {
    hydration ??= restoreBulkChoicePreferences(storage).then((restored) => {
      publish(restored);
      return restored;
    });

    return hydration;
  };

  return {
    getSnapshot: () => current,
    hydrate,
    reset: async () => {
      // A reset before the first read must not be overwritten by it.
      await hydrate();
      publish(DEFAULT_BULK_CHOICE_PREFERENCES);
      await resetBulkChoicePreferences(storage);
    },
    subscribe: (listener) => {
      listeners.add(listener);

      return () => {
        listeners.delete(listener);
      };
    },
    update: async (change) => {
      await hydrate();
      const next = { ...current, ...change };

      publish(next);
      await persistBulkChoicePreferences(next, storage);
    },
  };
};

export const bulkChoicePreferencesStore = createBulkChoicePreferencesStore();

/** The stored defaults, live; hydrates from the device on first use. */
export const useBulkChoicePreferences = () => {
  const preferences = useSyncExternalStore(
    bulkChoicePreferencesStore.subscribe,
    bulkChoicePreferencesStore.getSnapshot,
  );

  void bulkChoicePreferencesStore.hydrate();

  return preferences;
};
