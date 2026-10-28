import type { AppIconName } from '../../components/app-icon';

export type PracticeToolId = 'piano' | 'pitch' | 'other-octave';

export type PracticeToolRow = {
  id: PracticeToolId;
  label: string;
  icon: AppIconName;
  checked: boolean;
  /** Names the tool and its state, since the switch alone is not read out. */
  accessibilityLabel: string;
  /** A muted line under the label, for a row that needs explaining. */
  description?: string;
  /** A divider is drawn above this row: it is a setting, not a tool. */
  startsGroup?: boolean;
};

export type PracticeToolsModel = {
  /** False when no tool is available, so the control is simply absent. */
  isVisible: boolean;
  /** Any tool is on: the control shows its pressed state. */
  isActive: boolean;
  triggerLabel: string;
  menuTitle: string;
  rows: PracticeToolRow[];
};

/** What one tool contributes; `null` where the platform cannot offer it. */
export type PracticeToolState = { checked: boolean } | null;

export type PracticeToolsInput = {
  piano: PracticeToolState;
  pitch: PracticeToolState;
  /** Offered only while the sheet music viewer is open (design Decision 4). */
  otherOctave: PracticeToolState;
  isSheetMusicOpen: boolean;
};

export const PRACTICE_TOOLS_LABEL = 'Practice tools';

const TOOL_ROWS = [
  { id: 'piano', label: 'Piano', icon: 'piano-keyboard' },
  { id: 'pitch', label: 'Pitch detection', icon: 'microphone-outline' },
] as const;
const OTHER_OCTAVE_LABEL = 'Show other-octave matches';
const OTHER_OCTAVE_DESCRIPTION =
  'Also lightly marks the same note in other octaves';

const buildRow = (
  id: PracticeToolId,
  label: string,
  icon: AppIconName,
  checked: boolean,
  extras: Pick<PracticeToolRow, 'description' | 'startsGroup'> = {},
): PracticeToolRow => {
  return {
    id,
    label,
    icon,
    checked,
    accessibilityLabel: `${label}, ${checked ? 'on' : 'off'}`,
    ...extras,
  };
};

/**
 * One toggle row per available tool. The tools themselves are the rows that
 * decide visibility: `Show other-octave matches` is a setting, so it never
 * makes the control appear on its own, and it is listed only next to a score.
 */
export const getPracticeToolsModel = (
  input: PracticeToolsInput,
): PracticeToolsModel => {
  const rows: PracticeToolRow[] = [];

  TOOL_ROWS.forEach(({ id, label, icon }) => {
    const state = id === 'piano' ? input.piano : input.pitch;

    if (state) {
      rows.push(buildRow(id, label, icon, state.checked));
    }
  });

  const isActive = rows.some((row) => row.checked);
  const isVisible = rows.length > 0;

  if (isVisible && input.isSheetMusicOpen && input.otherOctave) {
    rows.push(
      buildRow(
        'other-octave',
        OTHER_OCTAVE_LABEL,
        'music-notes-plus',
        input.otherOctave.checked,
        { description: OTHER_OCTAVE_DESCRIPTION, startsGroup: true },
      ),
    );
  }

  return {
    isVisible,
    isActive,
    triggerLabel: PRACTICE_TOOLS_LABEL,
    menuTitle: PRACTICE_TOOLS_LABEL,
    rows,
  };
};
