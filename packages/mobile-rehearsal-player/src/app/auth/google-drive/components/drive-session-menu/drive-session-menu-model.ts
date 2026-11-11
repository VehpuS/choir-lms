import type { LayoutClass } from '../../../../routing/shell/layout-class';

/**
 * What the account card keeps clear of: the header it hangs from (the account
 * button's row and the gap under it) and a small margin at the bottom.
 */
export const ACCOUNT_MENU_RESERVED_HEIGHT = 80;

/**
 * The tallest the account card may be. In the wide-short layout (a phone on its
 * side, about 390 points high) its seven actions are taller than the window,
 * so the card scrolls inside this height and every action stays reachable.
 * Undefined means no limit, which is how the compact layout has always been.
 */
export const getAccountMenuMaxHeight = (
  layoutClass: LayoutClass,
  windowHeight: number,
): number | undefined => {
  return layoutClass === 'wide-short'
    ? Math.max(windowHeight - ACCOUNT_MENU_RESERVED_HEIGHT, 0)
    : undefined;
};
