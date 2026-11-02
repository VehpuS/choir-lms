import type {
  RecordingDriveFilter,
  RecordingKindFilter,
  RecordingsFilters,
  RecordingsSort,
} from './recordings-library-model';

/**
 * The choices the Library `Recordings` view offers (rehearsal-recording
 * design Decision 15): sort options and the filter sheet's toggles. Kept apart
 * from the view so the labels and toggle rules are specced without rendering.
 */

export const RECORDINGS_SORT_OPTIONS: readonly {
  label: string;
  value: RecordingsSort;
}[] = [
  { label: 'Newest', value: 'newest' },
  { label: 'Track', value: 'track' },
  { label: 'Length', value: 'length' },
  { label: 'Name', value: 'name' },
];

export const RECORDINGS_KIND_OPTIONS: readonly {
  label: string;
  value: RecordingKindFilter;
}[] = [
  { label: 'Whole track', value: 'whole' },
  { label: 'Segment', value: 'segment' },
  { label: 'Loop', value: 'loop' },
  { label: 'Adjusted', value: 'adjusted' },
];

export const RECORDINGS_DRIVE_OPTIONS: readonly {
  label: string;
  value: RecordingDriveFilter;
}[] = [
  { label: 'On Drive', value: 'on-drive' },
  { label: 'Not on Drive', value: 'not-on-drive' },
];

export const ORIGINAL_CHANGED_FILTER_LABEL = 'Original changed';
export const NEEDS_CONNECTION_FILTER_LABEL = 'Needs connection for overlay';

/** Choosing the chosen value again clears it; choosing another replaces it. */
export const toggleChoice = <Value extends string>(
  current: Value | undefined,
  next: Value,
): Value | undefined => (current === next ? undefined : next);

export const NO_RECORDINGS_FILTERS: RecordingsFilters = {};
