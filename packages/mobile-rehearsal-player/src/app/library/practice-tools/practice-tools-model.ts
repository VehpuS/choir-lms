import type { AppIconName } from '../../components/app-icon';

export type PracticeToolId = 'piano' | 'pitch';

export type PracticeToolRow = {
  id: PracticeToolId;
  label: string;
  icon: AppIconName;
  checked: boolean;
  /** Names the tool and its state, since the switch alone is not read out. */
  accessibilityLabel: string;
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
};

export const PRACTICE_TOOLS_LABEL = 'Practice tools';

const TOOL_ROWS = [
  { id: 'piano', label: 'Piano', icon: 'piano-keyboard' },
  { id: 'pitch', label: 'Pitch detection', icon: 'microphone-outline' },
] as const;

const buildRow = (
  id: PracticeToolId,
  label: string,
  icon: AppIconName,
  checked: boolean,
): PracticeToolRow => {
  return {
    id,
    label,
    icon,
    checked,
    accessibilityLabel: `${label}, ${checked ? 'on' : 'off'}`,
  };
};

/**
 * One toggle row per available tool; the control is absent when there are
 * none. Settings (such as `Show other-octave matches`) are not rows here: they
 * live with the surface they affect.
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

  return {
    isVisible,
    isActive,
    triggerLabel: PRACTICE_TOOLS_LABEL,
    menuTitle: PRACTICE_TOOLS_LABEL,
    rows,
  };
};
