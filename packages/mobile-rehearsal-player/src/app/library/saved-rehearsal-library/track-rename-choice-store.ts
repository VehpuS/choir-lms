import { useSyncExternalStore } from 'react';

import type { TrackRenameCopiesChoice } from './track-rename-model';
import {
  persistTrackRenameCopiesChoice,
  restoreTrackRenameCopiesChoice,
} from './track-rename-preference-storage';

// The Files rename prompt and the Settings page share one live copy of the
// remembered choice, so a change in either shows in the other at once (same
// pattern as the bulk choice preferences store). `null` asks each time.

type Listener = () => void;
type ChoiceStorage = Parameters<typeof restoreTrackRenameCopiesChoice>[0];

export type TrackRenameChoiceStore = {
  getSnapshot: () => TrackRenameCopiesChoice | null;
  /** Reads the stored choice once; later calls share the same read. */
  hydrate: () => Promise<TrackRenameCopiesChoice | null>;
  subscribe: (listener: Listener) => () => void;
  /** Remembers a choice, or clears it with `null` so the prompt returns. */
  set: (choice: TrackRenameCopiesChoice | null) => Promise<void>;
};

export const createTrackRenameChoiceStore = (
  storage?: ChoiceStorage,
): TrackRenameChoiceStore => {
  let current: TrackRenameCopiesChoice | null = null;
  let hydration: Promise<TrackRenameCopiesChoice | null> | null = null;
  const listeners = new Set<Listener>();

  const publish = (next: TrackRenameCopiesChoice | null) => {
    current = next;
    listeners.forEach((listener) => {
      listener();
    });
  };

  const hydrate = () => {
    hydration ??= restoreTrackRenameCopiesChoice(storage).then((restored) => {
      publish(restored);
      return restored;
    });

    return hydration;
  };

  return {
    getSnapshot: () => current,
    hydrate,
    set: async (choice) => {
      // A change before the first read must not be overwritten by it.
      await hydrate();
      publish(choice);
      await persistTrackRenameCopiesChoice(choice, storage);
    },
    subscribe: (listener) => {
      listeners.add(listener);

      return () => {
        listeners.delete(listener);
      };
    },
  };
};

export const trackRenameChoiceStore = createTrackRenameChoiceStore();

/** The remembered choice, live; hydrates from the device on first use. */
export const useTrackRenameCopiesChoice = () => {
  const choice = useSyncExternalStore(
    trackRenameChoiceStore.subscribe,
    trackRenameChoiceStore.getSnapshot,
  );

  void trackRenameChoiceStore.hydrate();

  return choice;
};
