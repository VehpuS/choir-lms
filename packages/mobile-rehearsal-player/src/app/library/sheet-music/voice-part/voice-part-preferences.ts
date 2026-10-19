import {
  VOICE_SECTION_LABELS,
  classifyVoiceSection,
  type PartSelectionRequest,
  type ScorePart,
  type SheetMusicPartSelection,
  type VoiceSection,
} from '@org/audio-library-models';

/**
 * Device-wide voice part memory. `defaultVoice` is the singer's explicit
 * choice (Settings, or `Make <Part> my part` in the viewer); `latestVoice` is
 * learned from using the viewer and only applies while no default is set.
 */
export type VoicePartPreferences = {
  defaultVoice: VoiceSection | undefined;
  latestVoice: VoiceSection | undefined;
};

export const DEFAULT_VOICE_PART_PREFERENCES: VoicePartPreferences = {
  defaultVoice: undefined,
  latestVoice: undefined,
};

/** The voice to ask the viewer for when a source has no saved selection. */
export const resolvePreferredVoice = (
  preferences: VoicePartPreferences,
): VoiceSection | undefined => {
  return preferences.defaultVoice ?? preferences.latestVoice;
};

/**
 * The one choir section the shown parts belong to, or undefined when they
 * span several sections, include an unclassified part, or nothing is shown.
 * Only then does the viewer learn a latest part or offer `my part`.
 */
export const singleVisibleVoice = (
  visible: readonly Pick<ScorePart, 'name' | 'instrument' | 'kind'>[],
): VoiceSection | undefined => {
  const sections = new Set(visible.map(classifyVoiceSection));

  if (sections.size !== 1) {
    return undefined;
  }

  const [section] = sections;

  return section;
};

export type MyPartChip = {
  accessibilityLabel: string;
  isOn: boolean;
  label: string;
  /** What pressing it stores as the default: the section, or none to clear it. */
  nextDefault: VoiceSection | undefined;
};

/**
 * The viewer's `Make <Part> my part` control, offered while the shown parts
 * are one section; pressing it again clears the default (back to `Automatic`).
 */
export const buildMyPartChip = (
  visible: readonly Pick<ScorePart, 'name' | 'instrument' | 'kind'>[],
  defaultVoice: VoiceSection | undefined,
): MyPartChip | undefined => {
  const section = singleVisibleVoice(visible);

  if (section === undefined) {
    return undefined;
  }

  const name = VOICE_SECTION_LABELS[section];
  const isOn = defaultVoice === section;
  const label = isOn ? `${name} is my part` : `Make ${name} my part`;

  return {
    accessibilityLabel: isOn ? `${label}, press to clear` : label,
    isOn,
    label,
    nextDefault: isOn ? undefined : section,
  };
};

/**
 * What the viewer asks the renderer for: the source's own (saved or just
 * chosen) selection, else the preferred voice, else the default.
 */
export const resolveRequestedSelection = (
  own: SheetMusicPartSelection | undefined,
  preferredVoice: VoiceSection | undefined,
): PartSelectionRequest | undefined => {
  if (own !== undefined) {
    return own;
  }

  return preferredVoice === undefined
    ? undefined
    : { preferVoice: preferredVoice };
};
