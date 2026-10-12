import type { PlayableItem } from '@org/audio-library-models';

import type { SourceLyricsResolution } from '../../hooks/use-source-lyrics';

export const LYRICS_PREVIEW_LINES = 4;

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

  if (!lyrics) {
    return { kind: 'empty', ownerName: owner.name };
  }

  const isShared = item.kind === 'loop' || owner.id !== item.sourceId;

  return {
    kind: 'filled',
    ownerName: owner.name,
    sharedFromName: isShared ? owner.name : null,
    text: lyrics.text,
  };
};
