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
 * Calls `onChange` with the page when it changes. Scrolling is read at most
 * once a frame, and nothing is reported while the page stays the same, so a
 * viewer that sets state from it re-renders once per page, not once per scroll
 * event.
 */
export const createPageTracker = (options: {
  host: ScrollTarget;
  onChange?: (page: number) => void;
  pageOf: () => number;
  /** Replaceable in specs; defaults to `requestAnimationFrame`. */
  requestFrame?: (callback: () => void) => void;
}): PageTracker => {
  const requestFrame = options.requestFrame ?? requestBrowserFrame;
  let lastPage = options.pageOf();
  let isFrameQueued = false;
  let isDisposed = false;

  const check = () => {
    if (isDisposed) {
      return;
    }

    const page = options.pageOf();

    if (page !== lastPage) {
      lastPage = page;
      options.onChange?.(page);
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
