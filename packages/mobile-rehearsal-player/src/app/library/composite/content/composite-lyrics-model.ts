import {
  buildCompositeLyricsPicker,
  type CompositeTrack,
} from '@org/audio-library-models';

import type { DriveLibrarySource } from '../../drive/utils/drive-library-view-model';
import type { SourceLyricsResolution } from '../../lyrics/hooks/use-source-lyrics';

/**
 * A composite's lyrics come from its stems (composite-tracks 8.2): the view
 * shows the picked stem's lyrics, offers a picker when more than one stem has
 * lyrics, and edits go to the picked stem's track. With no lyrics anywhere
 * every stem can be picked, so `Add` saves on the stem the user chooses.
 */

export type CompositeLyricsInfo = {
  compositeId: string;
  /** The stems the picker offers: those with lyrics, else every stem that has a track. */
  choices: { id: string; name: string }[];
  selectedStemId: string | undefined;
  /** The picked stem's name, for the note and the editor title. */
  stemName: string | undefined;
  showPicker: boolean;
  /** Stems without lyrics while others have some (`Alto and Bass have none`). */
  withoutLyricsNames: string[];
  /** No stem has lyrics yet. */
  isChoosingWhereToAdd: boolean;
};

export const resolveCompositeLyrics = (
  composite: Pick<CompositeTrack, 'id' | 'stems' | 'lyricsStemId'>,
  tracks: readonly DriveLibrarySource[],
): SourceLyricsResolution & { composite: CompositeLyricsInfo } => {
  const trackOf = (trackId: string) =>
    tracks.find(({ id }) => id === trackId) ?? null;
  const picker = buildCompositeLyricsPicker(
    composite.stems.map((stem) => ({
      id: stem.id,
      name: stem.name,
      lyrics: trackOf(stem.trackId)?.lyrics,
    })),
    composite.lyricsStemId,
  );
  const choices = picker.empty
    ? composite.stems
        .filter((stem) => trackOf(stem.trackId))
        .map(({ id, name }) => ({ id, name }))
    : picker.choices;
  const remembered = choices.find(({ id }) => id === composite.lyricsStemId);
  const selected = picker.empty ? (remembered ?? choices[0]) : undefined;
  const selectedStemId = picker.empty ? selected?.id : picker.selectedStemId;
  const stem = composite.stems.find(({ id }) => id === selectedStemId);
  const owner = stem ? trackOf(stem.trackId) : null;

  return {
    lyrics: owner?.lyrics,
    owner,
    composite: {
      compositeId: composite.id,
      choices,
      selectedStemId,
      stemName: stem?.name,
      showPicker: choices.length > 1,
      withoutLyricsNames: picker.empty
        ? []
        : picker.withoutLyrics.map(({ name }) => name),
      isChoosingWhereToAdd: picker.empty,
    },
  };
};

/** `Baritone.m4a (Stem 2)`: the track the lyrics belong to, then the stem. */
export const describeLyricsOwner = (
  trackName: string,
  stemName?: string,
): string => {
  return stemName && stemName !== trackName
    ? `${trackName} (${stemName})`
    : trackName;
};

/** `Alto and Bass have none`. */
export const describeStemsWithoutLyrics = (
  names: readonly string[],
): string => {
  if (names.length === 0) {
    return '';
  }

  const joined =
    names.length === 1
      ? names[0]
      : `${names.slice(0, -1).join(', ')} and ${names[names.length - 1]}`;

  return names.length === 1 ? `${joined} has none` : `${joined} have none`;
};
