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

export const hasExplorerTrailingControls = (
  actions?: ReactNode,
  overflowTrigger?: ReactNode,
) => {
  return actions != null || overflowTrigger != null;
};
