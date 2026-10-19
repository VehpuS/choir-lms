import {
  PRESET_PART_NAMES,
  hasPartPreference,
} from '@org/audio-library-models';

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
