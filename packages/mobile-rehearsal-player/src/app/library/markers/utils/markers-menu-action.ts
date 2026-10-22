import type { OptionsMenuAction } from '../../components/options-menu-sheet/model';
import {
  MARKERS_LABEL,
  requestSavedItemAction,
} from '../../components/saved-item-menu/saved-item-requests';

/** What a Library menu needs to offer markers for one item. */
export type MarkersMenuState = {
  /** Opens the markers list for the item (its owning track's markers). */
  onOpenMarkers: () => void;
};

/**
 * The `Markers` action of a saved-item menu. It always opens the markers
 * sheet and always reads `Markers`.
 */
export const resolveMarkersMenuActions = (
  markers: MarkersMenuState | undefined,
  idPrefix: string,
): OptionsMenuAction[] => {
  if (!markers) {
    return [];
  }

  return [
    {
      id: `${idPrefix}:markers`,
      label: MARKERS_LABEL,
      onPress: markers.onOpenMarkers,
      tone: 'secondary',
    },
  ];
};

/** Menu state for a track (by source id) or a loop (by loop id). */
export const createMarkersMenuState = (options: {
  id: string;
  kind: 'loop' | 'track';
}): MarkersMenuState => ({
  onOpenMarkers: () => {
    requestSavedItemAction({
      action: 'markers',
      id: options.id,
      kind: options.kind,
    });
  },
});
