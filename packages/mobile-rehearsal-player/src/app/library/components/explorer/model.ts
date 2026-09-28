import type { ReactNode } from 'react';

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
