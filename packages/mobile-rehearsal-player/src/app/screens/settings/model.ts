import {
  PRESET_PART_NAMES,
  hasPartPreference,
  type SearchSourceKind,
  type SearchTemplateProblem,
} from '@org/audio-library-models';

import { formatPresetSize } from '../../library/offline/format-byte-size';
import { AUDIO_CACHE_BUDGET_PRESETS_BYTES } from '../../library/playback/audio-cache/audio-cache-budget';
import {
  parsePianoPreferences,
  type PianoPreferences,
} from '../../library/piano/piano-preferences';
import type { SettingsCategoryKey } from './settings-navigation-store';
import type { BulkChoicePreferences } from '../../library/selection/bulk-choices';

export type SettingsPreferenceRow = {
  body: string;
  key: keyof BulkChoicePreferences;
  options: ReadonlyArray<{ label: string; value: string }>;
  title: string;
};

export const SETTINGS_COPY = {
  backLabel: 'Back to settings',
  closeLabel: 'Close settings',
  resetLabel: 'Ask each time for both',
  sectionTitle: 'Bulk selections',
  sectionBody:
    'What to do when a playback or playlist action meets playlists inside folders, or the same item more than once.',
  title: 'Settings',
} as const;

export type SettingsCategory = {
  key: SettingsCategoryKey;
  summary: string;
  title: string;
};

// Order is the order of the category list.
export const SETTINGS_CATEGORIES: readonly SettingsCategory[] = [
  {
    key: 'bulk-selections',
    summary: 'What to do when several items are selected',
    title: SETTINGS_COPY.sectionTitle,
  },
  { key: 'piano', summary: 'Sound and note names', title: 'Piano' },
  {
    key: 'pitch',
    summary: 'How quiet a sound may be and still count',
    title: 'Pitch detection',
  },
  { key: 'my-parts', summary: 'Your voice parts', title: 'My parts' },
  {
    key: 'search-sources',
    summary: 'Where sheet music and lyrics are searched',
    title: 'Search sources',
  },
  {
    key: 'offline-storage',
    summary: 'Cache size and files kept on this device',
    title: 'Offline storage',
  },
];

export type SettingsCategoryAvailability = {
  canListenForPitch: boolean;
  canPlayPiano: boolean;
  canStoreOffline: boolean;
};

/**
 * Piano settings only exist where the piano can play, Pitch detection only
 * where the microphone can be listened to, and Offline storage only where
 * audio can be stored (web, until native follows).
 */
export const visibleSettingsCategories = ({
  canListenForPitch,
  canPlayPiano,
  canStoreOffline,
}: SettingsCategoryAvailability) => {
  return SETTINGS_CATEGORIES.filter((category) => {
    if (category.key === 'piano') {
      return canPlayPiano;
    }

    if (category.key === 'pitch') {
      return canListenForPitch;
    }

    return category.key !== 'offline-storage' || canStoreOffline;
  });
};

export const findSettingsCategory = (key: SettingsCategoryKey) => {
  return SETTINGS_CATEGORIES.find((category) => category.key === key);
};

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
  addHeading: 'Tap a part to add it',
  addLabel: 'Add a part',
  addPlaceholder: 'Part name',
  body: 'Sheet music opens on the first part in your list that your score has ("Alto" also finds "Alto 2").',
  customLabel: 'Other…',
  emptyLabel: 'No parts added. Sheet music opens the part you viewed last.',
  saveLabel: 'Add',
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
  body: 'The keyboard that opens over playback and sheet music.',
  // Required by the samples' licence (CC BY 3.0): author, work, licence, and
  // a note that the recordings were trimmed and converted.
  credit:
    'Piano recordings: Salamander Grand Piano by Alexander Holm, licensed CC BY 3.0, trimmed and converted for this app.',
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
    body: 'The tone of the keys and tapped notes.',
    key: 'sound',
    options: [
      { label: 'Piano', value: 'piano' },
      { label: 'Organ', value: 'organ' },
    ],
    title: 'Sound',
  },
  {
    body: 'Which keys are labelled.',
    key: 'showAllNoteNames',
    options: [
      { label: 'C only', value: OFF_VALUE },
      { label: 'All keys', value: ON_VALUE },
    ],
    title: 'Note names',
  },
  {
    body: 'How black keys are spelled.',
    key: 'accidentals',
    options: [
      { label: 'Sharps', value: 'sharps' },
      { label: 'Flats', value: 'flats' },
    ],
    title: 'Black keys',
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

export const OFFLINE_STORAGE_COPY = {
  body: 'Audio you play is kept on this device so it replays without downloading. Files you choose to keep offline are stored separately and never removed automatically.',
  cacheSizeBody:
    'How much recently played audio to keep. Lowering it removes the least recently used files now; kept files are not affected.',
  cacheSizeTitle: 'Cache size',
  openFilesLabel: 'Open offline files',
  usedTitle: 'Storage used',
} as const;

export const OFFLINE_CACHE_SIZE_OPTIONS = AUDIO_CACHE_BUDGET_PRESETS_BYTES.map(
  (bytes) => ({ label: formatPresetSize(bytes), value: String(bytes) }),
);

export const PITCH_SETTINGS_COPY = {
  body: 'Listens through the microphone to show the note you sing. Nothing you sing is recorded or sent anywhere.',
} as const;
