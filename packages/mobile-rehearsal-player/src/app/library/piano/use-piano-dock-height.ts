import { useLayoutClass } from '../../routing/shell/layout-class';
import { pianoCapabilities } from './piano-capabilities';
import {
  pianoPresentationHeight,
  resolvePianoPresentation,
} from './piano-overlay-model';
import { usePianoPreferences } from './piano-preferences';

const DOCK_BORDER_WIDTH = 1;

/** How tall the open piano dock is, or 0 when closed or unavailable. */
export const usePianoDockHeight = (): number => {
  const { heightStep, isOpen } = usePianoPreferences();
  const presentation = resolvePianoPresentation(useLayoutClass());

  if (!isOpen || !pianoCapabilities().canPlay) {
    return 0;
  }

  return pianoPresentationHeight(presentation, heightStep) + DOCK_BORDER_WIDTH;
};
