import type { AppIconName } from '../../components/app-icon/model';
import { appTheme } from '../../utils/theme';
import type { ShellDestinationKey } from './shell-model';

export type ShellTabPresentation = {
  color: string;
  iconName: AppIconName;
  showActiveMark: boolean;
};

// Each destination keeps one Phosphor glyph; the active tab switches it to
// the fill weight (README "Mini player + tab bar").
const TAB_ICONS: Record<
  ShellDestinationKey,
  { active: AppIconName; inactive: AppIconName }
> = {
  recents: { active: 'history-filled', inactive: 'history' },
  add: { active: 'folder-plus', inactive: 'folder-plus-outline' },
  library: {
    active: 'music-note-multiple',
    inactive: 'music-note-multiple-outline',
  },
};

// Body-size accent text on the dark ground uses the lighter accent step.
const ACTIVE_TAB_COLOR = appTheme.colors.accentText;
const INACTIVE_TAB_COLOR = appTheme.colors.textMuted;

export const getShellTabPresentation = (
  destination: ShellDestinationKey,
  isActive: boolean,
): ShellTabPresentation => {
  const icons = TAB_ICONS[destination];

  if (isActive) {
    return {
      color: ACTIVE_TAB_COLOR,
      iconName: icons.active,
      showActiveMark: true,
    };
  }

  return {
    color: INACTIVE_TAB_COLOR,
    iconName: icons.inactive,
    showActiveMark: false,
  };
};
