import { useSyncExternalStore } from 'react';

// Settings opens from the avatar menu, which every destination header hosts,
// and shows over the destinations. A tiny external store lets the menu open it
// and the shell render it without threading a callback through each screen
// (same pattern as the pinned bulk bar store).

type Listener = () => void;

export type SettingsCategoryKey =
  | 'bulk-selections'
  | 'piano'
  | 'pitch'
  | 'my-parts'
  | 'search-sources'
  | 'offline-storage';

export type SettingsNavigationStore = {
  /** Goes from a category page to the category list, or closes from the list. */
  back: () => void;
  close: () => void;
  getPage: () => SettingsCategoryKey | null;
  getSnapshot: () => boolean;
  open: () => void;
  openPage: (page: SettingsCategoryKey) => void;
  subscribe: (listener: Listener) => () => void;
};

export const createSettingsNavigationStore = (): SettingsNavigationStore => {
  let isOpen = false;
  // `null` is the category list; opening and closing always return to it.
  let page: SettingsCategoryKey | null = null;
  const listeners = new Set<Listener>();

  const setState = (
    nextOpen: boolean,
    nextPage: SettingsCategoryKey | null,
  ) => {
    if (nextOpen === isOpen && nextPage === page) {
      return;
    }

    isOpen = nextOpen;
    page = nextPage;
    listeners.forEach((listener) => {
      listener();
    });
  };

  return {
    back: () => {
      if (page === null) {
        setState(false, null);

        return;
      }

      setState(isOpen, null);
    },
    close: () => {
      setState(false, null);
    },
    getPage: () => page,
    getSnapshot: () => isOpen,
    open: () => {
      setState(true, null);
    },
    openPage: (next) => {
      setState(true, next);
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

export const useSettingsPage = () => {
  return useSyncExternalStore(
    settingsNavigationStore.subscribe,
    settingsNavigationStore.getPage,
  );
};
