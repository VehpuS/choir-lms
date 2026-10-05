import type { ReactNode } from 'react';

import type { AppIconName } from '../../../components/app-icon';
import { appTheme } from '../../../utils/theme';

export type ExplorerBreadcrumbItem = {
  isCurrent?: boolean;
  key: string;
  label: string;
  onPress?: () => void;
};

export type ResolvedExplorerBreadcrumbItem = ExplorerBreadcrumbItem & {
  isCurrent: boolean;
  isDisabled: boolean;
};

export const getExplorerBackAccessibilityLabel = (canGoBack: boolean) => {
  return canGoBack ? 'Go to parent folder' : 'Already at root';
};

export const resolveExplorerBreadcrumbItems = (
  items: ExplorerBreadcrumbItem[],
): ResolvedExplorerBreadcrumbItem[] => {
  return items.map((item, index) => {
    const isCurrent = item.isCurrent ?? index === items.length - 1;

    return {
      ...item,
      isCurrent,
      isDisabled: isCurrent || item.onPress === undefined,
    };
  });
};

/**
 * Rows in a list are divided by hairlines, with none before the first row or
 * after the last (screen 1b row anatomy).
 */
export const interleaveExplorerRowSeparators = <Item, Separator>(
  items: Item[],
  createSeparator: (index: number) => Separator,
): (Item | Separator)[] => {
  return items.flatMap((item, index) => {
    return index === 0 ? [item] : [createSeparator(index), item];
  });
};

export const hasExplorerTrailingControls = (
  actions?: ReactNode,
  overflowTrigger?: ReactNode,
) => {
  return actions != null || overflowTrigger != null;
};

/** Selection wiring a surface hands to a row; the row renders and routes it. */
export type ExplorerRowSelection = {
  /** True while the list is in selection mode. */
  isActive: boolean;
  isSelected: boolean;
  /** Long-press outside selection mode: enters it with this row selected. */
  onEnter: () => void;
  onToggle: () => void;
};

type ExplorerRowSelectionGlyph = {
  color: string;
  name: AppIconName;
};

/**
 * Selection-mode glyph for a row (design Decision 8): an empty circle, or a
 * filled check in the accent. The shape change carries the state, so it never
 * rests on color alone; the row also accents its active mark.
 */
export const getRowSelectionGlyph = (
  isSelected: boolean,
): ExplorerRowSelectionGlyph => {
  return isSelected
    ? { color: appTheme.colors.accent, name: 'check-circle' }
    : { color: appTheme.colors.icon, name: 'circle-outline' };
};

export type ResolvedExplorerRowSelection = {
  /** `aria-checked` rather than `accessibilityState`, which react-native-web drops (8.15). */
  ariaChecked: boolean | undefined;
  glyph: ExplorerRowSelectionGlyph | null;
  hidesTrailingControls: boolean;
  isMarked: boolean;
  onLongPress: (() => void) | undefined;
  onPress: (() => void) | undefined;
  role: 'button' | 'checkbox';
};

/**
 * In selection mode a tap always toggles, the leading glyph becomes the
 * selection glyph, and trailing controls are hidden. Outside it, the row keeps
 * its own press and only gains the long-press entry.
 */
export const resolveExplorerRowSelection = (
  selection: ExplorerRowSelection | undefined,
  onPress: (() => void) | undefined,
): ResolvedExplorerRowSelection => {
  if (selection === undefined) {
    return {
      ariaChecked: undefined,
      glyph: null,
      hidesTrailingControls: false,
      isMarked: false,
      onLongPress: undefined,
      onPress,
      role: 'button',
    };
  }

  if (!selection.isActive) {
    return {
      ariaChecked: undefined,
      glyph: null,
      hidesTrailingControls: false,
      isMarked: false,
      onLongPress: selection.onEnter,
      onPress,
      role: 'button',
    };
  }

  return {
    ariaChecked: selection.isSelected,
    glyph: getRowSelectionGlyph(selection.isSelected),
    hidesTrailingControls: true,
    isMarked: selection.isSelected,
    onLongPress: undefined,
    onPress: selection.onToggle,
    role: 'checkbox',
  };
};
