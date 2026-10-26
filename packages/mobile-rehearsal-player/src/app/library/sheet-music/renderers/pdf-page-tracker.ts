import type { PdfPageRange } from './pdf-layout-model';

type ScrollTarget = {
  addEventListener(type: 'scroll', listener: () => void): void;
  removeEventListener(type: 'scroll', listener: () => void): void;
};

export type PageTracker = {
  /** Reports the page now if it changed (after a layout change that moves no scroll). */
  check(): void;
  dispose(): void;
};

const requestBrowserFrame = (callback: () => void): void => {
  const request = (
    globalThis as { requestAnimationFrame?: (cb: () => void) => unknown }
  ).requestAnimationFrame;

  if (request) {
    request(callback);
  } else {
    setTimeout(callback, 0);
  }
};

/**
 * Calls `onChange` with the pages in view when they change. Scrolling is read
 * at most once a frame, and nothing is reported while the pages stay the same,
 * so a viewer that sets state from it re-renders once per change, not once per
 * scroll event.
 */
export const createPageTracker = (options: {
  host: ScrollTarget;
  onChange?: (range: PdfPageRange) => void;
  rangeOf: () => PdfPageRange;
  /** Replaceable in specs; defaults to `requestAnimationFrame`. */
  requestFrame?: (callback: () => void) => void;
}): PageTracker => {
  const requestFrame = options.requestFrame ?? requestBrowserFrame;
  let last = options.rangeOf();
  let isFrameQueued = false;
  let isDisposed = false;

  const check = () => {
    if (isDisposed) {
      return;
    }

    const range = options.rangeOf();

    if (range.first !== last.first || range.last !== last.last) {
      last = range;
      options.onChange?.(range);
    }
  };

  const onScroll = () => {
    if (isFrameQueued) {
      return;
    }

    isFrameQueued = true;
    requestFrame(() => {
      isFrameQueued = false;
      check();
    });
  };

  options.host.addEventListener('scroll', onScroll);

  return {
    check,
    dispose() {
      isDisposed = true;
      options.host.removeEventListener('scroll', onScroll);
    },
  };
};
