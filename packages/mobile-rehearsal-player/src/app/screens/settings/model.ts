import {
  PRESET_PART_NAMES,
  hasPartPreference,
  type SearchSourceKind,
  type SearchTemplateProblem,
} from '@org/audio-library-models';

import {
  parsePianoPreferences,
  type PianoPreferences,
} from '../../library/piano/piano-preferences';
import type { BulkChoicePreferences } from '../../library/selection/bulk-choices';

export type SettingsPreferenceRow = {
  body: string;
  key: keyof BulkChoicePreferences;
  options: ReadonlyArray<{ label: string; value: string }>;
  title: string;
};

export const SETTINGS_COPY = {
  closeLabel: 'Close settings',
  resetLabel: 'Ask each time for both',
  sectionTitle: 'Selecting several items',
  sectionBody:
    'What to do when a playback or playlist action meets playlists inside folders, or the same item more than once.',
  title: 'Settings',
} as const;

const ASK_OPTION = { label: 'Ask each time', value: 'ask' } as const;

export const SETTINGS_PREFERENCE_ROWS: readonly SettingsPreferenceRow[] = [
  {
    body: 'When selected folders contain playlists.',
    key: 'playlistsInFolders',
    options: [
      ASK_OPTION,
      { label: 'Include', value: 'include' },
      { label: 'Skip', value: 'skip' },
    ],
    title: 'Playlists in folders',
  },
  {
    body: 'When the same track or loop would be added more than once.',
    key: 'repeatedItems',
    options: [
      ASK_OPTION,
      { label: 'Keep', value: 'keep' },
      { label: 'Remove', value: 'remove' },
    ],
    title: 'Repeated items',
  },
];

/** Reset is only useful once at least one default is stored. */
export const hasStoredBulkChoiceDefault = (
  preferences: BulkChoicePreferences,
) => {
  return (
    preferences.playlistsInFolders !== 'ask' ||
    preferences.repeatedItems !== 'ask'
  );
};

export const MY_PARTS_COPY = {
  addLabel: 'Add a part',
  addPlaceholder: 'Part name',
  body: 'Sheet music opens on the first part in this list that your score has. A whole name is tried first, then a close match, so "Alto" also finds "Alto 2". With no parts listed, it follows the part you viewed last. A part you picked for a piece stays as you left it.',
  customLabel: 'Other…',
  emptyLabel: 'Automatic',
  saveLabel: 'Add',
  sectionTitle: 'Sheet music',
  title: 'Your parts',
} as const;

/** The built-in names not yet on the list, for the quick-add chips. */
export const buildPartPresetChips = (listed: readonly string[]): string[] => {
  return PRESET_PART_NAMES.filter((name) => !hasPartPreference(listed, name));
};

export const SEARCH_SOURCES_COPY: Record<
  SearchSourceKind,
  { body: string; title: string }
> = {
  lyrics: {
    body: 'Where the lyrics editor searches. The first is the default; the dropdown there picks another.',
    title: 'Lyrics search',
  },
  'sheet-music': {
    body: 'Where adding sheet music searches. The first is the default; the dropdown there picks another.',
    title: 'Score search',
  },
};

export const SEARCH_SOURCE_FORM_COPY = {
  addLabel: 'Add a source',
  customLabel: 'Other…',
  hint: 'Use {query} for the title and artist together, or {title} and {artist}. The address must start with https.',
  labelPlaceholder: 'Name',
  resetLabel: 'Restore defaults',
  saveLabel: 'Add',
  templatePlaceholder: 'https://example.com/search?q={query}',
} as const;

export const SEARCH_TEMPLATE_PROBLEM_MESSAGES: Record<
  SearchTemplateProblem,
  string
> = {
  'invalid-address': 'That is not a complete web address (no spaces).',
  'no-placeholder': 'Add {query}, {title}, or {artist} where the search goes.',
  'not-https': 'The address must start with https.',
  'too-long': 'That address is too long.',
};

/** The site a source searches, shown under its name. */
export const describeSearchSourceHost = (urlTemplate: string): string => {
  return /^https:\/\/([^/?#]+)/i.exec(urlTemplate)?.[1] ?? '';
};

export const PIANO_SETTINGS_COPY = {
  body: 'The keyboard that opens over playback and the sheet music. Notes always sound at concert pitch.',
  // Required by the samples' licence (CC BY 3.0): author, work, licence, and
  // a note that the recordings were trimmed and converted.
  credit:
    'Piano recordings: Salamander Grand Piano by Alexander Holm, licensed CC BY 3.0, trimmed and converted for this app.',
  sectionTitle: 'Piano',
} as const;

export type PianoPreferenceKey = 'sound' | 'showAllNoteNames' | 'accidentals';

export type PianoPreferenceRow = {
  body: string;
  key: PianoPreferenceKey;
  options: ReadonlyArray<{ label: string; value: string }>;
  title: string;
};

const ON_VALUE = 'on';
const OFF_VALUE = 'off';

export const PIANO_PREFERENCE_ROWS: readonly PianoPreferenceRow[] = [
  {
    body: 'The tone the keys and tapped notes make. A change applies from the next key.',
    key: 'sound',
    options: [
      { label: 'Piano', value: 'piano' },
      { label: 'Organ', value: 'organ' },
    ],
    title: 'Sound',
  },
  {
    body: 'Name every key, not only the C keys.',
    key: 'showAllNoteNames',
    options: [
      { label: 'Off', value: OFF_VALUE },
      { label: 'On', value: ON_VALUE },
    ],
    title: 'Show every note name',
  },
  {
    body: 'How black keys are spelled when they are named.',
    key: 'accidentals',
    options: [
      { label: 'Sharps', value: 'sharps' },
      { label: 'Flats', value: 'flats' },
    ],
    title: 'Black key names',
  },
];

/** The segmented-control value for a row, given the stored preferences. */
export const pianoPreferenceValue = (
  preferences: PianoPreferences,
  key: PianoPreferenceKey,
): string => {
  if (key === 'showAllNoteNames') {
    return preferences.showAllNoteNames ? ON_VALUE : OFF_VALUE;
  }

  return preferences[key];
};

/** What choosing a value changes, validated by the store's own parser. */
export const pianoPreferencePatch = (
  key: PianoPreferenceKey,
  value: string,
): Partial<PianoPreferences> => {
  if (key === 'showAllNoteNames') {
    return { showAllNoteNames: value === ON_VALUE };
  }

  const parsed = parsePianoPreferences({ [key]: value });

  return key === 'sound'
    ? { sound: parsed.sound }
    : { accidentals: parsed.accidentals };
};
