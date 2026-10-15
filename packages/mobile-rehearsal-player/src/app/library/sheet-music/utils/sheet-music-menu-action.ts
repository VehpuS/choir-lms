import type { OptionsMenuAction } from '../../components/options-menu-sheet/model';
import {
  requestSavedItemAction,
  SHEET_MUSIC_LABEL,
} from '../../components/saved-item-menu/saved-item-requests';

/** What a Library menu needs to offer sheet music for one item. */
export type SheetMusicMenuState = {
  /** Opens the sheet music manager for the item (its owning track's sources). */
  onOpenSheetMusic: () => void;
};

/**
 * The `Sheet music` action of a saved-item menu. It always opens the manager
 * sheet and always reads `Sheet music` (design Decision 13, Option A).
 */
export const resolveSheetMusicMenuActions = (
  sheetMusic: SheetMusicMenuState | undefined,
  idPrefix: string,
): OptionsMenuAction[] => {
  if (!sheetMusic) {
    return [];
  }

  return [
    {
      id: `${idPrefix}:sheet-music`,
      label: SHEET_MUSIC_LABEL,
      onPress: sheetMusic.onOpenSheetMusic,
      tone: 'secondary',
    },
  ];
};

/** Menu state for a track (by source id) or a loop (by loop id). */
export const createSheetMusicMenuState = (options: {
  id: string;
  kind: 'loop' | 'track';
}): SheetMusicMenuState => ({
  onOpenSheetMusic: () => {
    requestSavedItemAction({
      action: 'sheet-music',
      id: options.id,
      kind: options.kind,
    });
  },
});
