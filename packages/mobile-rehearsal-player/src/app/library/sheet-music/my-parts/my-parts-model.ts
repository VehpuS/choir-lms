import {
  addPartPreferenceFirst,
  hasPartPreference,
  removePartPreference,
  type PartSelectionRequest,
  type ScorePart,
  type SheetMusicPartSelection,
} from '@org/audio-library-models';

/**
 * Device-wide part memory. `parts` is the singer's ordered list (Settings, or
 * `Make <Part> my part` in the viewer); `latestPart` is the exact name of the
 * single part last shown with the chips, tried after the list.
 */
export type MyPartsPreferences = {
  latestPart: string | undefined;
  parts: string[];
};

export const DEFAULT_MY_PARTS_PREFERENCES: MyPartsPreferences = {
  latestPart: undefined,
  parts: [],
};

/**
 * What the viewer asks the renderer for: the source's own (saved or just
 * chosen) selection, else the singer's preferences, else the default.
 */
export const resolveRequestedSelection = (
  own: SheetMusicPartSelection | undefined,
  preferences: MyPartsPreferences,
): PartSelectionRequest | undefined => {
  if (own !== undefined) {
    return own;
  }

  if (preferences.parts.length === 0 && preferences.latestPart === undefined) {
    return undefined;
  }

  return {
    learnedPart: preferences.latestPart,
    preferParts: preferences.parts,
  };
};

/** The exact name to remember when exactly one part is left showing. */
export const learnPartName = (
  visible: readonly Pick<ScorePart, 'name'>[],
): string | undefined => {
  return visible.length === 1 ? visible[0].name : undefined;
};

export type MyPartChip = {
  accessibilityLabel: string;
  isOn: boolean;
  label: string;
  /** The list after pressing it: the part added first, or removed. */
  nextParts: string[];
};

/**
 * The viewer's `Make <Part> my part` control, offered while exactly one part
 * is showing; pressing it again removes the part from the list.
 */
export const buildMyPartChip = (
  visible: readonly Pick<ScorePart, 'name'>[],
  parts: readonly string[],
): MyPartChip | undefined => {
  const name = learnPartName(visible);

  if (name === undefined) {
    return undefined;
  }

  const isOn = hasPartPreference(parts, name);
  const label = isOn ? `${name} is my part` : `Make ${name} my part`;

  return {
    accessibilityLabel: isOn ? `${label}, press to clear` : label,
    isOn,
    label,
    nextParts: isOn
      ? removePartPreference(parts, name)
      : addPartPreferenceFirst(parts, name),
  };
};
