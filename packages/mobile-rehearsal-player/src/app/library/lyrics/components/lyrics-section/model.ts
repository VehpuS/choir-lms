import type { PlayableItem } from '@org/audio-library-models';

import { describeLyricsOwner } from '../../../composite/content/composite-lyrics-model';
import type { SourceLyricsResolution } from '../../hooks/use-source-lyrics';

export const LYRICS_PREVIEW_LINES = 4;

/**
 * Below this window height the playback screen has no room for lyrics under
 * the controls, so the section offers only `View` (reading mode).
 */
export const MIN_WINDOW_HEIGHT_FOR_INLINE_LYRICS = 800;

export const shouldShowInlineLyrics = (windowHeight: number): boolean => {
  return windowHeight >= MIN_WINDOW_HEIGHT_FOR_INLINE_LYRICS;
};

export type LyricsSectionModel =
  /** The owning track is gone: nothing to show or add. */
  | { kind: 'hidden' }
  | { kind: 'empty'; ownerName: string }
  | {
      kind: 'filled';
      ownerName: string;
      /** Set when the lyrics belong to a different track than the one playing. */
      sharedFromName: string | null;
      text: string;
    };

/**
 * What the playback Lyrics section shows for the playing item. A loop or an
 * adjusted track reads its owning track's lyrics and names that track.
 */
export const resolveLyricsSectionModel = (
  item: Pick<PlayableItem, 'kind' | 'sourceId'>,
  resolution: SourceLyricsResolution,
): LyricsSectionModel => {
  const { lyrics, owner } = resolution;

  if (!owner) {
    return { kind: 'hidden' };
  }

  // A composite names the stem the lyrics come from, then its track.
  const ownerName = describeLyricsOwner(
    owner.name,
    resolution.composite?.stemName,
  );

  if (!lyrics) {
    return { kind: 'empty', ownerName };
  }

  const isShared = item.kind === 'loop' || owner.id !== item.sourceId;

  return {
    kind: 'filled',
    ownerName,
    sharedFromName: isShared ? ownerName : null,
    text: lyrics.text,
  };
};
