/**
 * How far below the content area a full-screen overlay (Settings, Offline
 * files) reaches: down over the docked practice tools, which are laid out
 * beneath the content. Negative because the overlay's edge is measured from the
 * content area's bottom; a closed dock gives 0.
 */
export const getOverlayBottomOffset = (practiceDockHeight: number): number =>
  practiceDockHeight > 0 ? -practiceDockHeight : 0;
