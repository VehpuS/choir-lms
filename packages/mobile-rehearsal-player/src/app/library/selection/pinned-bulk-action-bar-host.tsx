import type { ReactNode } from 'react';

import { BulkActionBar } from './bulk-action-bar';
import { usePinnedBulkActionBarProps } from './use-pinned-bulk-action-bar';

type PinnedBulkActionBarHostProps = {
  /** The bottom dock (mini-player and tab bar) the bar sits over. */
  children: ReactNode;
};

// Owns the store subscription so only this component re-renders when the bar
// changes. Subscribing in the shell itself would re-render the destination
// screens (they are render props of the shell) and the owner would republish
// its props in a loop.
export const PinnedBulkActionBarHost = ({
  children,
}: PinnedBulkActionBarHostProps) => {
  const barProps = usePinnedBulkActionBarProps();

  return barProps ? <BulkActionBar {...barProps} /> : <>{children}</>;
};
