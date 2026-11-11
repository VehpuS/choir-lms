import { useSyncExternalStore } from 'react';

import { DEFAULT_CARD_OFFSET, type CardOffset } from './card-position-model';

// Where the card sits and whether it is collapsed, kept for the session so
// closing the playback view and opening it again finds the card where the
// singer left it. Not stored on the device: a new session starts in the corner.
type CardState = { isCollapsed: boolean; offset: CardOffset };

let current: CardState = { isCollapsed: false, offset: DEFAULT_CARD_OFFSET };
const listeners = new Set<() => void>();

const publish = (next: CardState) => {
  current = next;
  listeners.forEach((listener) => {
    listener();
  });
};

const subscribe = (listener: () => void) => {
  listeners.add(listener);

  return () => {
    listeners.delete(listener);
  };
};

export const useCardState = (): CardState => {
  return useSyncExternalStore(subscribe, () => current);
};

export const setCardOffset = (offset: CardOffset) => {
  publish({ ...current, offset });
};

export const setCardCollapsed = (isCollapsed: boolean) => {
  publish({ ...current, isCollapsed });
};
