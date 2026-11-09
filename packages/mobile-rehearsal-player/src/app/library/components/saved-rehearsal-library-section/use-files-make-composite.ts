import { useMemo } from 'react';

import { compositeCapabilities } from '../../composite/composite-capabilities';
import { requestCompositeCreate } from '../../composite/create/composite-create-request';
import type { BulkActionHandlers } from '../../selection/bulk-action-assembly';
import {
  resolveMakeCompositeSelection,
  type MakeCompositeSelection,
} from '../../selection/make-composite-selection';
import type { BulkSelectionItem } from '../../selection/playback-expansion';

type FilesMakeComposite = {
  /** Handlers to spread into the bar's; empty where composites cannot be made. */
  handlers: BulkActionHandlers;
  selection: MakeCompositeSelection;
};

/**
 * `Make composite…` for the Files selection (composite-tracks 7.5): offered
 * for two or more selected tracks only. Any folder, loop, playlist or
 * composite in the selection means nothing is offered (the resolver checks).
 */
export const useFilesMakeComposite = (options: {
  items: readonly BulkSelectionItem[];
  sources: Parameters<typeof resolveMakeCompositeSelection>[0]['sources'];
  /** Ends the selection once a composite was created (not on cancel). */
  onCreated: () => void;
}): FilesMakeComposite => {
  const canMakeComposite = compositeCapabilities().canPlayComposites;
  const selection = useMemo(
    () =>
      resolveMakeCompositeSelection({
        canMakeComposite,
        items: options.items,
        sources: options.sources,
      }),
    [canMakeComposite, options.items, options.sources],
  );
  const handlers = useMemo<BulkActionHandlers>(
    () =>
      canMakeComposite
        ? {
            'make-composite': () => {
              requestCompositeCreate(selection.trackIds, options.onCreated);
            },
          }
        : {},
    [canMakeComposite, options.onCreated, selection.trackIds],
  );

  return { handlers, selection };
};
