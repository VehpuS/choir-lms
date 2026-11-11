// Fixed widths of the wide-short layout's side panels. They are the width of
// the panel's own content: where a safe-area inset sits on the same edge (the
// Dynamic Island beside the rail, say) the web adds it on top (dock-bleed.web.ts),
// so the entries and controls never lose room to it.

/** The side rail: wide enough for a `Recents` label. */
export const RAIL_WIDTH = 84;

/** The Now Playing pane on the trailing side. */
export const NOW_PLAYING_PANE_WIDTH = 280;
