import type { PlayableItem } from '@org/audio-library-models';
import { createContext, useContext, type ReactNode } from 'react';

type SavedItemAvailability = {
  /**
   * Whether the track that owns the lyrics of a track, adjusted track, or loop
   * (named by its source id) has lyrics; menus then read `Edit lyrics`.
   */
  hasLyricsFor: (sourceId: string) => boolean;
  savedLoopIds: ReadonlySet<string>;
  savedSourceIds: ReadonlySet<string>;
};

const EMPTY_AVAILABILITY: SavedItemAvailability = {
  hasLyricsFor: () => false,
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

/** For menus built in plain functions that cannot read context themselves. */
export const useHasLyricsFor = () => {
  return useContext(SavedItemAvailabilityContext).hasLyricsFor;
};

/** Whether lyrics exist for the track that owns this item's lyrics. */
export const useHasLyrics = (item: Pick<PlayableItem, 'sourceId'>): boolean => {
  return useContext(SavedItemAvailabilityContext).hasLyricsFor(item.sourceId);
};
