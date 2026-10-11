import { useSyncExternalStore } from 'react';

// Settings opens from the avatar menu, which every destination header hosts,
// and shows over the destinations. A tiny external store lets the menu open it
// and the shell render it without threading a callback through each screen
// (same pattern as the pinned bulk bar store).

type Listener = () => void;

export type SettingsNavigationStore = {
  close: () => void;
  getSnapshot: () => boolean;
  open: () => void;
  subscribe: (listener: Listener) => () => void;
};

export const createSettingsNavigationStore = (): SettingsNavigationStore => {
  let isOpen = false;
  const listeners = new Set<Listener>();

  const setOpen = (next: boolean) => {
    if (next === isOpen) {
      return;
    }

    isOpen = next;
    listeners.forEach((listener) => {
      listener();
    });
  };

  return {
    close: () => {
      setOpen(false);
    },
    getSnapshot: () => isOpen,
    open: () => {
      setOpen(true);
    },
    subscribe: (listener) => {
      listeners.add(listener);

      return () => {
        listeners.delete(listener);
      };
    },
  };
};

// One Settings surface exists, so a module-level instance is enough.
export const settingsNavigationStore = createSettingsNavigationStore();

export const useIsSettingsOpen = () => {
  return useSyncExternalStore(
    settingsNavigationStore.subscribe,
    settingsNavigationStore.getSnapshot,
  );
};
