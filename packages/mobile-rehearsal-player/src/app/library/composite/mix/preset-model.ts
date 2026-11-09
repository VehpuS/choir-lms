import {
  MAX_MIX_PRESET_NAME_LENGTH,
  type CompositeMix,
  type CompositeTrack,
} from '@org/audio-library-models';
import {
  ALL_PARTS_PRESET_ID,
  MINE_LOUDER_PRESET_ID,
  WITHOUT_MINE_PRESET_ID,
  canResetSessionMix,
  listMixPresets,
  mixesEqual,
  type SessionMix,
} from '@org/audio-mixing';

/**
 * The presets menu and the `Save as preset` sheet (composite-tracks design
 * Decision 7). Pure; the sheets and the store calls sit around it. The part
 * presets are left out when no stem is marked as the user's part, because the
 * built-in list already does that.
 */

export const PRESETS_MENU_TITLE = 'Mix presets';
export const BUILT_IN_GROUP_LABEL = 'Built in';
export const SAVED_GROUP_LABEL = 'Saved by you';
export const RESET_LABEL = 'Reset to the saved default';
export const MAKE_DEFAULT_LABEL = 'Make this mix the default';
export const SAVE_PRESET_LABEL = 'Save as preset';
export const SAVE_PRESET_TITLE = 'Save mix as preset';
export const SAVE_PRESET_HINT =
  'Saved with this composite. Pick it again from the “Mix” panel.';
export const PRESET_NAME_LABEL = 'Preset name';
export const MAKE_DEFAULT_SWITCH_LABEL = 'Start with this mix';
export const MAX_PRESET_NAME_LENGTH = MAX_MIX_PRESET_NAME_LENGTH;
export const DEFAULT_META = 'Default';

const BUILT_IN_SUBTITLES: Record<string, string> = {
  [ALL_PARTS_PRESET_ID]: 'Every stem at 100%',
  [WITHOUT_MINE_PRESET_ID]: 'Your part muted',
  [MINE_LOUDER_PRESET_ID]: 'Your part 150%, others 70%',
};

export type PresetMenuRow = {
  id: string;
  name: string;
  subtitle?: string;
  /** The session mix has this preset's levels. */
  isCurrent: boolean;
  /** The composite starts from this preset's levels. */
  isDefault: boolean;
  mix: CompositeMix;
};

export type PresetMenuModel = {
  builtIn: PresetMenuRow[];
  saved: PresetMenuRow[];
  canReset: boolean;
  canMakeDefault: boolean;
};

export const buildPresetMenuModel = (
  composite: Pick<CompositeTrack, 'stems' | 'presets'>,
  session: SessionMix,
): PresetMenuModel => {
  const { stems } = composite;
  const rows = listMixPresets(composite).map((preset) => ({
    row: {
      id: preset.id,
      name: preset.name,
      subtitle: BUILT_IN_SUBTITLES[preset.id],
      isCurrent: mixesEqual(stems, preset.mix, session.mix),
      isDefault: mixesEqual(stems, preset.mix, session.savedDefault),
      mix: preset.mix,
    } satisfies PresetMenuRow,
    builtIn: preset.builtIn,
  }));
  const differsFromDefault = canResetSessionMix(stems, session);

  return {
    builtIn: rows.filter((entry) => entry.builtIn).map((entry) => entry.row),
    saved: rows.filter((entry) => !entry.builtIn).map((entry) => entry.row),
    canReset: differsFromDefault,
    canMakeDefault: differsFromDefault,
  };
};

const WHITESPACE_RUN_PATTERN = /\s+/g;
const collapse = (text: string) =>
  text.replace(WHITESPACE_RUN_PATTERN, ' ').trim();

export type SavePresetModel = {
  name: string;
  canSave: boolean;
  /** Set when the name is already a saved preset, which saving replaces. */
  replacesNote: string | null;
};

export const resolveSavePresetModel = (
  rawName: string,
  presets: readonly { name: string }[],
): SavePresetModel => {
  const name = collapse(rawName).slice(0, MAX_PRESET_NAME_LENGTH);
  const existing = presets.find(
    (preset) => preset.name.toLowerCase() === name.toLowerCase(),
  );

  return {
    name,
    canSave: name.length > 0,
    replacesNote: existing
      ? `Replaces the saved preset “${existing.name}”.`
      : null,
  };
};

export const MANAGE_PRESETS_LABEL = 'Manage saved presets…';
export const MANAGE_PRESETS_TITLE = 'Saved presets';
export const RENAME_PRESET_LABEL = 'Rename';
export const DELETE_PRESET_LABEL = 'Delete preset';
export const DELETE_PRESET_QUESTION =
  'Delete this preset? This cannot be undone.';
export const KEEP_PRESET_LABEL = 'Keep';
export const BACK_LABEL = 'Back';

export type RenamePresetModel = { name: string; canRename: boolean };

/** A rename needs a new name that no other saved preset has (ignoring case). */
export const resolveRenamePresetModel = (
  rawName: string,
  preset: { id: string; name: string },
  presets: readonly { id: string; name: string }[],
): RenamePresetModel => {
  const name = collapse(rawName).slice(0, MAX_PRESET_NAME_LENGTH);
  const taken = presets.some(
    (other) =>
      other.id !== preset.id && other.name.toLowerCase() === name.toLowerCase(),
  );

  return { name, canRename: name.length > 0 && !taken && name !== preset.name };
};
