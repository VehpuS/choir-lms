import { useSyncExternalStore } from 'react';

import type { MicrophoneChoice } from './microphone-choice-model';
import {
  persistMicrophoneChoice,
  restoreMicrophoneChoice,
} from './microphone-choice-storage';

// The microphone prompt and the Settings page share one live copy of the
// remembered choice (same pattern as the remembered rename choice).

type Listener = () => void;
type ChoiceStorage = Parameters<typeof restoreMicrophoneChoice>[0];

export type MicrophoneChoiceStore = {
  getSnapshot: () => MicrophoneChoice | null;
  /** Reads the stored choice once; later calls share the same read. */
  hydrate: () => Promise<MicrophoneChoice | null>;
  subscribe: (listener: Listener) => () => void;
  /** Remembers a choice, or clears it with `null` so the prompt returns. */
  set: (choice: MicrophoneChoice | null) => Promise<void>;
};

export const createMicrophoneChoiceStore = (
  storage?: ChoiceStorage,
): MicrophoneChoiceStore => {
  let current: MicrophoneChoice | null = null;
  let hydration: Promise<MicrophoneChoice | null> | null = null;
  const listeners = new Set<Listener>();

  const publish = (next: MicrophoneChoice | null) => {
    current = next;
    listeners.forEach((listener) => {
      listener();
    });
  };

  const hydrate = () => {
    hydration ??= restoreMicrophoneChoice(storage).then((restored) => {
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
      await persistMicrophoneChoice(choice, storage);
    },
    subscribe: (listener) => {
      listeners.add(listener);

      return () => {
        listeners.delete(listener);
      };
    },
  };
};

export const microphoneChoiceStore = createMicrophoneChoiceStore();

/** The remembered choice, live; hydrates from the device on first use. */
export const useMicrophoneChoice = () => {
  const choice = useSyncExternalStore(
    microphoneChoiceStore.subscribe,
    microphoneChoiceStore.getSnapshot,
  );

  void microphoneChoiceStore.hydrate();

  return choice;
};
