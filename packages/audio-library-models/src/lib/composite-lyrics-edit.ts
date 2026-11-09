import type { CompositeTrack } from './composite-track.ts';

/**
 * Remembers which stem's lyrics the composite shows (design Decision 11). A
 * stem the composite does not have changes nothing, so a stale pick cannot be
 * stored.
 */
export const setCompositeLyricsStem = (
  composite: CompositeTrack,
  stemId: string,
): CompositeTrack => {
  if (!composite.stems.some((stem) => stem.id === stemId)) {
    return composite;
  }

  return { ...composite, lyricsStemId: stemId };
};
