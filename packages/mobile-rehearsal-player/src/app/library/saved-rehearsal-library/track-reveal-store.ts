import { useSyncExternalStore } from 'react';

/**
 * Asks the Library to show one track: the router switches to the Tracks view,
 * the row scrolls into view and flashes (composite-tracks 12.8). The request
 * stays until the row consumes it, so a row mounted after the view switch
 * still sees it.
 */
export type TrackRevealRequest = { trackId: string; requestId: number };

/** Scrolls the Library so a point (in window coordinates) is near the top. */
export type RevealScroller = (windowY: number) => void;

let request: TrackRevealRequest | null = null;
let nextRequestId = 0;
let scroller: RevealScroller | null = null;
const listeners = new Set<() => void>();

const publish = (next: TrackRevealRequest | null) => {
  request = next;
  listeners.forEach((listener) => listener());
};

export const requestTrackReveal = (trackId: string): void => {
  nextRequestId += 1;
  publish({ requestId: nextRequestId, trackId });
};

export const clearTrackReveal = (requestId: number): void => {
  // A newer request must not be cleared by an older row's timer.
  if (request?.requestId === requestId) {
    publish(null);
  }
};

export const useTrackRevealRequest = (): TrackRevealRequest | null =>
  useSyncExternalStore(
    (listener) => {
      listeners.add(listener);

      return () => {
        listeners.delete(listener);
      };
    },
    () => request,
  );

export const registerRevealScroller = (next: RevealScroller): (() => void) => {
  scroller = next;

  return () => {
    if (scroller === next) {
      scroller = null;
    }
  };
};

export const scrollLibraryToWindowY: RevealScroller = (windowY) => {
  scroller?.(windowY);
};
