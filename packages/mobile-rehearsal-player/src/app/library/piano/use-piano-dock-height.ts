import { pianoCapabilities } from './piano-capabilities';
import { pianoOverlayHeight } from './piano-overlay-model';
import { usePianoPreferences } from './piano-preferences';

const DOCK_BORDER_WIDTH = 1;

/** How tall the open piano dock is, or 0 when closed or unavailable. */
export const usePianoDockHeight = (): number => {
  const { heightStep, isCollapsed, isOpen } = usePianoPreferences();

  if (!isOpen || !pianoCapabilities().canPlay) {
    return 0;
  }

  return pianoOverlayHeight(heightStep, isCollapsed) + DOCK_BORDER_WIDTH;
};
