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
  /**
   * A folder with some of its contents selected but not itself selected
   * (nor inside a selected folder). Ignored when `isSelected` is true.
   */
  isPartial?: boolean;
  isSelected: boolean;
  /**
   * Keeps the row's trailing controls in selection mode. A folder row uses it
   * so its open control stays reachable while a tap on the row selects it.
   */
  keepsTrailingControls?: boolean;
  /** Long-press outside selection mode: enters it with this row selected. */
  onEnter: () => void;
  onToggle: () => void;
};

type ExplorerRowSelectionGlyph = {
  color: string;
  name: AppIconName;
};

export type ExplorerRowSelectionState = 'partial' | 'selected' | 'unselected';

export const getExplorerRowSelectionState = (
  selection: Pick<ExplorerRowSelection, 'isPartial' | 'isSelected'>,
): ExplorerRowSelectionState => {
  if (selection.isSelected) {
    return 'selected';
  }

  return selection.isPartial === true ? 'partial' : 'unselected';
};

const SELECTION_GLYPHS: Record<
  ExplorerRowSelectionState,
  ExplorerRowSelectionGlyph
> = {
  partial: { color: appTheme.colors.accent, name: 'minus-circle' },
  selected: { color: appTheme.colors.accent, name: 'check-circle' },
  unselected: { color: appTheme.colors.icon, name: 'circle-outline' },
};

/**
 * Selection-mode glyph for a row (design Decision 8): an empty circle, a
 * minus in the circle for a folder with only some contents selected, or a
 * filled check, the last two in the accent. The shape change carries the
 * state, so it never rests on color alone; a selected row also accents its
 * active mark.
 */
export const getRowSelectionGlyph = (
  state: ExplorerRowSelectionState,
): ExplorerRowSelectionGlyph => SELECTION_GLYPHS[state];

export type ResolvedExplorerRowSelection = {
  /** `aria-checked` rather than `accessibilityState`, which react-native-web drops (8.15). */
  ariaChecked: boolean | 'mixed' | undefined;
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

  const state = getExplorerRowSelectionState(selection);

  return {
    ariaChecked: state === 'partial' ? 'mixed' : state === 'selected',
    glyph: getRowSelectionGlyph(state),
    hidesTrailingControls: selection.keepsTrailingControls !== true,
    isMarked: selection.isSelected,
    onLongPress: undefined,
    onPress: selection.onToggle,
    role: 'checkbox',
  };
};
