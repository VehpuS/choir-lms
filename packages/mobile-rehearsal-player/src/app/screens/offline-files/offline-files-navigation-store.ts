import { useSyncExternalStore } from 'react';

// The offline files view opens from the avatar menu and shows over the
// destinations, like Settings: a tiny external store lets the menu open it and
// the shell render it without threading a callback through each screen.

type Listener = () => void;

export type OfflineFilesNavigationStore = {
  close: () => void;
  getSnapshot: () => boolean;
  open: () => void;
  subscribe: (listener: Listener) => () => void;
};

export const createOfflineFilesNavigationStore =
  (): OfflineFilesNavigationStore => {
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

export const offlineFilesNavigationStore = createOfflineFilesNavigationStore();

export const useIsOfflineFilesOpen = () => {
  return useSyncExternalStore(
    offlineFilesNavigationStore.subscribe,
    offlineFilesNavigationStore.getSnapshot,
  );
};
