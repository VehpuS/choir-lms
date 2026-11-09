import type {
  CompositeTrack,
  DriveAudioSource,
} from '@org/audio-library-models';

import { normalizeSearchQuery } from '../../search/utils/saved-library-search-view-model';

/**
 * The tracks a `Stem missing` row can be re-linked to (composite-tracks 12.10):
 * available library tracks that no other stem of the composite uses (the model
 * refuses a track twice), filtered by what the user typed.
 */
export const RELINK_SHEET_TITLE = 'Re-link stem';
export const RELINK_SEARCH_LABEL = 'Search tracks';
export const RELINK_EMPTY_MESSAGE = 'No unused tracks match.';
export const RELINK_CANCEL_LABEL = 'Cancel';

export type RelinkOption = { trackId: string; name: string };

export const resolveRelinkOptions = (options: {
  composite: Pick<CompositeTrack, 'stems'>;
  stemId: string;
  tracks: readonly DriveAudioSource[];
  query: string;
}): RelinkOption[] => {
  const query = normalizeSearchQuery(options.query);
  const usedElsewhere = new Set(
    options.composite.stems
      .filter((stem) => stem.id !== options.stemId)
      .map((stem) => stem.trackId),
  );

  return options.tracks
    .filter(
      (track) =>
        track.availability.status === 'available' &&
        !usedElsewhere.has(track.id) &&
        track.name.toLocaleLowerCase().includes(query),
    )
    .map((track) => ({ name: track.name, trackId: track.id }))
    .sort((left, right) => left.name.localeCompare(right.name));
};
