import { appTheme } from '../../../utils/theme';

const { colors, fontWeight } = appTheme;

/**
 * Tones of an iOS-style menu row: `default` for ordinary actions,
 * `preferred` for the action the menu leads with, `destructive` for
 * irreversible ones, `accent` for a create-style row (e.g. `New playlist…`),
 * and `cancel` for the dismiss row in its own group.
 */
export type MenuRowTone =
  | 'accent'
  | 'cancel'
  | 'default'
  | 'destructive'
  | 'preferred';

type MenuRowPalette = {
  fontWeight: (typeof fontWeight)[keyof typeof fontWeight];
  label: string;
};

const MENU_ROW_PALETTES: Record<MenuRowTone, MenuRowPalette> = {
  accent: { fontWeight: fontWeight.regular, label: colors.accentText },
  cancel: { fontWeight: fontWeight.medium, label: colors.text },
  default: { fontWeight: fontWeight.regular, label: colors.text },
  destructive: { fontWeight: fontWeight.regular, label: colors.danger },
  preferred: { fontWeight: fontWeight.medium, label: colors.accentText },
};

export const MENU_ROW_MIN_HEIGHT = 50;

export const resolveMenuRowPalette = (tone: MenuRowTone): MenuRowPalette => {
  return MENU_ROW_PALETTES[tone];
};

/**
 * Splits items into consecutive groups, starting a new group wherever
 * `startsGroup` marks an item (iOS separates action-sheet sections into
 * separate rounded groups rather than drawing a divider line).
 */
export const splitIntoMenuGroups = <Item>(
  items: Item[],
  startsGroup: boolean[],
): Item[][] => {
  return items.reduce<Item[][]>((groups, item, index) => {
    if (groups.length === 0 || startsGroup[index]) {
      return [...groups, [item]];
    }

    const lastGroup = groups[groups.length - 1] ?? [];

    return [...groups.slice(0, -1), [...lastGroup, item]];
  }, []);
};
