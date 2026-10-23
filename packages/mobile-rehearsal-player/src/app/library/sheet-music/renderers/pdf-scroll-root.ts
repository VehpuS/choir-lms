import type { HostElement } from './pdf-web-types';

const SCROLLABLE_OVERFLOW_PATTERN = /^(auto|scroll)$/;

/**
 * The element the pages scroll in: the host or its nearest scrolling ancestor,
 * else null (the page itself scrolls). `rootMargin` widens only the observer's
 * root, so it must be that element for the lookahead to work: inside a scroll
 * container, a page outside its bounds is clipped with no margin.
 */
export const findScrollRoot = (host: HostElement): HostElement | null => {
  const view = host.ownerDocument.defaultView;

  for (let node: HostElement | null = host; node; node = node.parentElement) {
    if (
      SCROLLABLE_OVERFLOW_PATTERN.test(
        view?.getComputedStyle(node).overflowY ?? '',
      )
    ) {
      return node;
    }
  }

  return null;
};
