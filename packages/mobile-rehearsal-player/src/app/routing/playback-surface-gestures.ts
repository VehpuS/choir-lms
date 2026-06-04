const PLAYBACK_SURFACE_DISMISS_DRAG_MIN_DISTANCE = 8;
const PLAYBACK_SURFACE_DISMISS_HANDLE_MAX_Y = 96;

export type PlaybackSurfaceDismissGesture = {
  dx: number;
  dy: number;
  locationY: number;
};

export const shouldStartPlaybackSurfaceDismissGesture = ({
  dx,
  dy,
  locationY,
}: PlaybackSurfaceDismissGesture) => {
  if (!Number.isFinite(locationY) || locationY < 0) {
    return false;
  }

  return (
    locationY <= PLAYBACK_SURFACE_DISMISS_HANDLE_MAX_Y &&
    dy > PLAYBACK_SURFACE_DISMISS_DRAG_MIN_DISTANCE &&
    Math.abs(dy) > Math.abs(dx)
  );
};
