import type { SourceLyricsResolution } from '../../hooks/use-source-lyrics';

/** The peek covers about half the screen, leaving the current screen visible. */
export const LYRICS_PEEK_HEIGHT_RATIO = 0.5;

/**
 * The mini-player's `Lyrics` control exists only while the playing item has
 * lyrics, so the mini-player never gains a dead control.
 */
export const shouldShowMiniPlayerLyrics = (
  resolution: SourceLyricsResolution,
): boolean => {
  return resolution.lyrics !== undefined;
};

export const resolveLyricsPeekMaxHeight = (windowHeight: number): number => {
  return Math.round(windowHeight * LYRICS_PEEK_HEIGHT_RATIO);
};
