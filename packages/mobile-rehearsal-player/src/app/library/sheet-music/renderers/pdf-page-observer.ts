import type { PdfLayout } from '@org/audio-library-models';

import { findScrollRoot } from './pdf-scroll-root';
import { pdfObserverMargin } from './pdf-layout-style';
import type { HostElement, PageObserverConstructor } from './pdf-web-types';

type ObservedPage = { isVisible: boolean; wrapper: unknown };

export type PageObserverHandle = {
  disconnect(): void;
  /** Reports every page's state now, and again as scrolling moves pages in or out of range. */
  observeAll(): void;
};

/**
 * Watches the pages' wrappers against the scroll element, with a look-ahead
 * margin along the layout's scroll axis. `rootMargin` widens only the
 * observer's root, so the root must be the scrolling element for the look-ahead
 * to work. Undefined where `IntersectionObserver` is missing (older browsers).
 */
export const createPageObserver = <Page extends ObservedPage>(options: {
  host: HostElement;
  layout: PdfLayout;
  onHidden: (page: Page) => void;
  onVisible: (page: Page) => void;
  pages: Page[];
}): PageObserverHandle | undefined => {
  const Observer = (
    globalThis as { IntersectionObserver?: PageObserverConstructor }
  ).IntersectionObserver;

  if (!Observer) {
    return undefined;
  }

  const pageByWrapper = new Map<unknown, Page>(
    options.pages.map((page) => [page.wrapper, page]),
  );
  const observer = new Observer(
    (changes) => {
      for (const change of changes) {
        const page = pageByWrapper.get(change.target);

        if (!page) {
          continue;
        }

        page.isVisible = change.isIntersecting;

        if (change.isIntersecting) {
          options.onVisible(page);
        } else {
          options.onHidden(page);
        }
      }
    },
    {
      root: findScrollRoot(options.host),
      rootMargin: pdfObserverMargin(options.layout),
    },
  );

  return {
    disconnect: () => observer.disconnect(),
    observeAll() {
      for (const page of options.pages) {
        page.isVisible = false;
        observer.observe(page.wrapper);
      }
    },
  };
};
