import {
  VOICE_SECTIONS,
  VOICE_SECTION_LABELS,
  type VoiceSection,
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

export const VOICE_PART_COPY = {
  automaticLabel: 'Automatic',
  body: 'Sheet music opens on this part when a score has several. Automatic follows the part you viewed last. A part you picked for a piece stays as you left it.',
  title: 'Your voice part',
  sectionTitle: 'Sheet music',
} as const;

export type VoicePartOption = {
  isSelected: boolean;
  label: string;
  value: VoiceSection | undefined;
};

/** `Automatic` first, then each choir section; the stored default is selected. */
export const buildVoicePartOptions = (
  defaultVoice: VoiceSection | undefined,
): VoicePartOption[] => [
  {
    isSelected: defaultVoice === undefined,
    label: VOICE_PART_COPY.automaticLabel,
    value: undefined,
  },
  ...VOICE_SECTIONS.map((section) => ({
    isSelected: defaultVoice === section,
    label: VOICE_SECTION_LABELS[section],
    value: section,
  })),
];
