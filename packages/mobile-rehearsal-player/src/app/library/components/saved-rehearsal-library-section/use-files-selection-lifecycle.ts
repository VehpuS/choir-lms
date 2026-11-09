import { useEffect } from 'react';

import type { RehearsalLibraryFileTree } from '@org/audio-library-models';

/**
 * Selection ends when the tab is left, and drops nodes the tree no longer has
 * (deleted, moved away by a bulk action) without leaving the mode.
 */
export const useFilesSelectionLifecycle = (options: {
  cancel: () => void;
  isDestinationActive: boolean;
  prune: (validKeys: ReadonlySet<string>) => void;
  tree: RehearsalLibraryFileTree | null;
}) => {
  const { cancel, isDestinationActive, prune, tree } = options;

  useEffect(() => {
    if (!isDestinationActive) {
      cancel();
    }
  }, [cancel, isDestinationActive]);

  useEffect(() => {
    if (tree) {
      prune(
        new Set([
          ...tree.folders.map(({ id }) => id),
          ...tree.fileLinks.map(({ id }) => id),
        ]),
      );
    }
  }, [prune, tree]);
};
