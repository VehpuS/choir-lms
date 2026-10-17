import { VIEWER_DEFAULT_ZOOM, VIEWER_MIN_ZOOM, stepViewerZoom } from './model';

/**
 * Fit to height (design Decision 11): a strip of staves is as tall as its
 * parts, which can be more than a phone held sideways leaves. Auto-fit shrinks
 * it to the height available but never below the zoom floor, so notes stay
 * legible; below the floor the score scrolls vertically instead.
 */
export const computeFitZoom = ({
  availableHeight,
  naturalHeight,
}: {
  availableHeight: number;
  naturalHeight: number;
}): number => {
  if (availableHeight <= 0 || naturalHeight <= 0) {
    return VIEWER_DEFAULT_ZOOM;
  }

  return Math.min(
    VIEWER_DEFAULT_ZOOM,
    Math.max(VIEWER_MIN_ZOOM, availableHeight / naturalHeight),
  );
};

export type ViewerZoomState = {
  /** Follows the measured fit until the singer zooms by hand. */
  fitEnabled: boolean;
  /** The latest fit measured for the drawn score, or `null` before one exists. */
  fitZoom: number | null;
  manualZoom: number;
};

export type ViewerZoomAction =
  | { type: 'fit' }
  | { type: 'measured'; zoom: number }
  | { direction: -1 | 1; type: 'step' };

export const INITIAL_VIEWER_ZOOM_STATE: ViewerZoomState = {
  fitEnabled: true,
  fitZoom: null,
  manualZoom: VIEWER_DEFAULT_ZOOM,
};

export const resolveViewerZoom = (state: ViewerZoomState): number => {
  return state.fitEnabled && state.fitZoom !== null
    ? state.fitZoom
    : state.manualZoom;
};

export const reduceViewerZoom = (
  state: ViewerZoomState,
  action: ViewerZoomAction,
): ViewerZoomState => {
  if (action.type === 'measured') {
    return { ...state, fitZoom: action.zoom };
  }

  if (action.type === 'fit') {
    return { ...state, fitEnabled: true };
  }

  // A step starts from what is on screen, then auto-fit stays out of the way.
  return {
    ...state,
    fitEnabled: false,
    manualZoom: stepViewerZoom(resolveViewerZoom(state), action.direction),
  };
};
