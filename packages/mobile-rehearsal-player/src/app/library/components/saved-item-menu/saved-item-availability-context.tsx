import type { PlayableItem } from '@org/audio-library-models';
import { createContext, useContext, type ReactNode } from 'react';

type SavedItemAvailability = {
  savedLoopIds: ReadonlySet<string>;
  savedSourceIds: ReadonlySet<string>;
};

const EMPTY_AVAILABILITY: SavedItemAvailability = {
  savedLoopIds: new Set(),
  savedSourceIds: new Set(),
};

const SavedItemAvailabilityContext =
  createContext<SavedItemAvailability>(EMPTY_AVAILABILITY);

export const SavedItemAvailabilityProvider = ({
  children,
  value,
}: {
  children: ReactNode;
  value: SavedItemAvailability;
}) => (
  <SavedItemAvailabilityContext.Provider value={value}>
    {children}
  </SavedItemAvailabilityContext.Provider>
);

/**
 * Whether the item's track or loop is in the library, so menus outside the
 * Library offer item actions only for saved items (task 8.26).
 */
export const useIsPlayableItemSaved = (
  item: Pick<PlayableItem, 'kind' | 'loopId' | 'sourceId'>,
): boolean => {
  const { savedLoopIds, savedSourceIds } = useContext(
    SavedItemAvailabilityContext,
  );

  return item.kind === 'loop' && item.loopId !== undefined
    ? savedLoopIds.has(item.loopId)
    : savedSourceIds.has(item.sourceId);
};
