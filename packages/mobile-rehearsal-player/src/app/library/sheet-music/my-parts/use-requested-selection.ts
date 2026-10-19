import type {
  PartSelectionRequest,
  SheetMusicPartSelection,
} from '@org/audio-library-models';
import { useMemo } from 'react';

import {
  resolveRequestedSelection,
  type MyPartsPreferences,
} from './my-parts-model';

/**
 * The part selection to ask the renderer for. Memoized because the surface
 * redraws whenever the selection's identity changes: a new `{ preferParts }`
 * object on every render would redraw forever.
 */
export const useRequestedSelection = (
  ownSelection: SheetMusicPartSelection | undefined,
  preferences: MyPartsPreferences,
): PartSelectionRequest | undefined => {
  return useMemo(
    () => resolveRequestedSelection(ownSelection, preferences),
    [ownSelection, preferences],
  );
};
