import { useEffect, useRef, useState } from 'react';
import type { View } from 'react-native';

import {
  clearTrackReveal,
  scrollLibraryToWindowY,
  useTrackRevealRequest,
} from './track-reveal-store';

const HIGHLIGHT_MS = 1800;
/** Lets the view switch lay the list out before measuring. */
const MEASURE_DELAY_MS = 150;

/**
 * For a Tracks row: when the Library is asked to show this track, scrolls the
 * row into view and highlights it briefly (composite-tracks 12.8).
 */
export const useRevealHighlight = (trackId: string) => {
  const reveal = useTrackRevealRequest();
  const ref = useRef<View | null>(null);
  const [isHighlighted, setIsHighlighted] = useState(false);
  const requestId = reveal?.trackId === trackId ? reveal.requestId : null;

  useEffect(() => {
    if (requestId === null) {
      return;
    }

    const measureTimer = setTimeout(() => {
      ref.current?.measureInWindow((_x, y) => {
        scrollLibraryToWindowY(y);
      });
      setIsHighlighted(true);
    }, MEASURE_DELAY_MS);
    const endTimer = setTimeout(() => {
      setIsHighlighted(false);
      clearTrackReveal(requestId);
    }, MEASURE_DELAY_MS + HIGHLIGHT_MS);

    return () => {
      clearTimeout(measureTimer);
      clearTimeout(endTimer);
    };
  }, [requestId]);

  return { isHighlighted, ref };
};
