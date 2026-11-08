import {
  checkStemLengths,
  MIN_COMPOSITE_STEMS,
  type DriveAudioSource,
} from '@org/audio-library-models';

import type { BulkSelectionItem } from './playback-expansion';

/**
 * What the Library's selection says about making a composite from the selected
 * tracks (composite-tracks spec, multi-selection): the action is offered for
 * two or more tracks, and is emphasised, with a line saying so, only when every
 * track has the same duration to within the one-second tolerance.
 */

export const SAME_LENGTH_LINE =
  'All the same length · a good fit for a composite';
export const DIFFERENT_LENGTH_LINE = 'Different lengths';

export type MakeCompositeOffer = {
  /** The tracks are all the same length: tint the action and move it onto the bar. */
  emphasised: boolean;
};

export type MakeCompositeSelection = {
  /** Null when the action is not offered (fewer than two tracks, or not only tracks). */
  offer: MakeCompositeOffer | null;
  /** The selected tracks in selection order. */
  trackIds: string[];
  /** The line under the count; null while a duration is not known yet or nothing is offered. */
  lengthLine: string | null;
};

const NOT_OFFERED: MakeCompositeSelection = {
  offer: null,
  trackIds: [],
  lengthLine: null,
};

export const resolveMakeCompositeSelection = (options: {
  /** False where composites cannot be made (no handler, or an unsupported platform). */
  canMakeComposite: boolean;
  items: readonly BulkSelectionItem[];
  sources: ReadonlyArray<Pick<DriveAudioSource, 'id' | 'durationMs'>>;
}): MakeCompositeSelection => {
  if (!options.canMakeComposite) {
    return NOT_OFFERED;
  }

  const trackIds = options.items.flatMap((item) =>
    item.kind === 'track' ? [item.entityId] : [],
  );

  // Folders, loops and playlists are not stems; a mixed selection offers nothing.
  if (
    trackIds.length !== options.items.length ||
    trackIds.length < MIN_COMPOSITE_STEMS
  ) {
    return NOT_OFFERED;
  }

  const durations = trackIds.map(
    (id) => options.sources.find((source) => source.id === id)?.durationMs,
  );
  const lengths = checkStemLengths(durations);

  return {
    offer: { emphasised: lengths.matches },
    trackIds,
    // A duration still being read says nothing rather than something wrong.
    lengthLine: lengths.waiting
      ? null
      : lengths.matches
        ? SAME_LENGTH_LINE
        : DIFFERENT_LENGTH_LINE,
  };
};
