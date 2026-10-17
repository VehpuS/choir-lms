import { useCallback, useReducer } from 'react';

import {
  INITIAL_VIEWER_ZOOM_STATE,
  reduceViewerZoom,
  resolveViewerZoom,
} from './fit-zoom-model';

/**
 * The viewer's zoom: a score is fitted to the height until the singer zooms by
 * hand. A PDF fits to width instead, so a fit measured for a score never
 * applies to it.
 */
export const useViewerZoom = (isScore: boolean) => {
  const [state, dispatch] = useReducer(
    reduceViewerZoom,
    INITIAL_VIEWER_ZOOM_STATE,
  );

  return {
    fit: useCallback(() => dispatch({ type: 'fit' }), []),
    isFitted: isScore && state.fitEnabled && state.fitZoom !== null,
    onFitZoom: useCallback(
      (zoom: number) => dispatch({ type: 'measured', zoom }),
      [],
    ),
    zoom: isScore ? resolveViewerZoom(state) : state.manualZoom,
    zoomIn: useCallback(() => dispatch({ direction: 1, type: 'step' }), []),
    zoomOut: useCallback(() => dispatch({ direction: -1, type: 'step' }), []),
  };
};
