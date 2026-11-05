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

const COMBINING_MARKS = /[\u0300-\u036f]/g;

/** Lower case with accents removed, so `faure` finds `Fauré` however it was typed. */
const toSearchKey = (text: string): string =>
  text.normalize('NFD').replace(COMBINING_MARKS, '').toLocaleLowerCase();

/** The tracks whose name contains the typed text, ignoring case and accents; all when blank. */
export const filterTrackOptions = (
  options: readonly RecordingTrackOption[],
  query: string,
): RecordingTrackOption[] => {
  const needle = toSearchKey(query.trim());

  return options.filter(
    (option) => !needle || toSearchKey(option.name).includes(needle),
  );
};

export const getTrackOptionLabel = optionLabel;
