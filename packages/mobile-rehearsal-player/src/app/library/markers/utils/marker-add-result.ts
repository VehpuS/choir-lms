import { MAX_TRACK_MARKERS, type TrackMarker } from '@org/audio-library-models';

import type { MarkerActionResult } from '../hooks/use-source-markers';

export const MARKER_LIMIT_MESSAGE = `This track already has ${MAX_TRACK_MARKERS} markers.`;
export const MARKER_ADD_FAILED_MESSAGE = 'Could not add the marker.';

export type MarkerAddResult = { marker: TrackMarker } | { error: string };

/** Turns a write outcome into the marker that was added or the reason it was not. */
export const toMarkerAddResult = (
  result: MarkerActionResult,
): MarkerAddResult => {
  if (result.status === 'ok' && result.marker) {
    return { marker: result.marker };
  }

  return {
    error:
      result.status === 'limit-reached'
        ? MARKER_LIMIT_MESSAGE
        : MARKER_ADD_FAILED_MESSAGE,
  };
};
