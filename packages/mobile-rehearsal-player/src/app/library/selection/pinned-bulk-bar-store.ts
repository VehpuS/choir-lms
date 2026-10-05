import type { BulkActionBarProps } from './bulk-action-bar';

// The bulk-action bar pins over the shell's bottom dock, but the selection
// that owns it lives deep inside a destination. A tiny external store lets the
// owner publish the bar's props and the shell host render them, without
// lifting selection state or re-rendering the whole shell on every change
// (a context value here would re-render the owner's own ancestors).

type Listener = () => void;

export type PinnedBulkBarStore = {
  getSnapshot: () => BulkActionBarProps | null;
  set: (props: BulkActionBarProps | null) => void;
  subscribe: (listener: Listener) => () => void;
};

export const createPinnedBulkBarStore = (): PinnedBulkBarStore => {
  let current: BulkActionBarProps | null = null;
  const listeners = new Set<Listener>();

  return {
    getSnapshot: () => current,
    set: (props) => {
      if (props === current) {
        return;
      }

      current = props;
      listeners.forEach((listener) => {
        listener();
      });
    },
    subscribe: (listener) => {
      listeners.add(listener);

      return () => {
        listeners.delete(listener);
      };
    },
  };
};

// One bar is ever on screen, so a module-level instance is enough.
export const pinnedBulkBarStore = createPinnedBulkBarStore();
