import type { OptionsMenuAction } from '../../components/options-menu-sheet/model';
import {
  ADD_LYRICS_LABEL,
  EDIT_LYRICS_LABEL,
  requestSavedItemAction,
} from '../../components/saved-item-menu/saved-item-requests';

/** What a Library menu needs to offer lyrics for one item. */
export type LyricsMenuState = {
  hasLyrics: boolean;
  /** Opens the lyrics editor for the item (its owning track's lyrics). */
  onEditLyrics: () => void;
};

/**
 * The `Lyrics` / `Edit lyrics` action of a saved-item menu. The label depends
 * on whether the owning track already has lyrics; both labels share one icon
 * and menu slot (task 4.1).
 */
export const resolveLyricsMenuActions = (
  lyrics: LyricsMenuState | undefined,
  idPrefix: string,
): OptionsMenuAction[] => {
  if (!lyrics) {
    return [];
  }

  return [
    {
      id: `${idPrefix}:lyrics`,
      label: lyrics.hasLyrics ? EDIT_LYRICS_LABEL : ADD_LYRICS_LABEL,
      onPress: lyrics.onEditLyrics,
      tone: 'secondary',
    },
  ];
};

/** Menu state for a track (by source id) or a loop (by loop id). */
export const createLyricsMenuState = (options: {
  hasLyrics: boolean;
  id: string;
  kind: 'loop' | 'track';
}): LyricsMenuState => ({
  hasLyrics: options.hasLyrics,
  onEditLyrics: () => {
    requestSavedItemAction({
      action: 'edit-lyrics',
      id: options.id,
      kind: options.kind,
    });
  },
});
