import type { RecordingTrackOption } from './recordings-library-model';

/** The picker's first row, which clears the track filter. */
export const ANY_TRACK_LABEL = 'Any track';
export const TRACK_PICKER_SEARCH_PLACEHOLDER = 'Search tracks';
export const TRACK_PICKER_EMPTY_MESSAGE = 'No tracks match.';

const optionLabel = (option: RecordingTrackOption) =>
  `${option.name} · ${option.count}`;

/** What the filter field shows: the chosen track with its count, or `Any track`. */
export const getTrackFilterValueLabel = (
  options: readonly RecordingTrackOption[],
  trackId: string | undefined,
): string => {
  const chosen = options.find((option) => option.trackId === trackId);

  return chosen ? optionLabel(chosen) : ANY_TRACK_LABEL;
};

/** The tracks whose name contains the typed text, ignoring case; all when it is blank. */
export const filterTrackOptions = (
  options: readonly RecordingTrackOption[],
  query: string,
): RecordingTrackOption[] => {
  const needle = query.trim().toLocaleLowerCase();

  return options.filter(
    (option) => !needle || option.name.toLocaleLowerCase().includes(needle),
  );
};

export const getTrackOptionLabel = optionLabel;
