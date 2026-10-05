import { useEffect, useSyncExternalStore } from 'react';

import type { BulkActionBarProps } from './bulk-action-bar';
import { pinnedBulkBarStore } from './pinned-bulk-bar-store';

/** Publishes (or, with `null`, withdraws) the bar the shell pins at the bottom. */
export const usePinnedBulkActionBar = (props: BulkActionBarProps | null) => {
  useEffect(() => {
    pinnedBulkBarStore.set(props);
  }, [props]);

  // Withdraw on unmount so leaving a destination never strands the bar.
  useEffect(() => {
    return () => {
      pinnedBulkBarStore.set(null);
    };
  }, []);
};

export const usePinnedBulkActionBarProps = () =>
  useSyncExternalStore(
    pinnedBulkBarStore.subscribe,
    pinnedBulkBarStore.getSnapshot,
  );
