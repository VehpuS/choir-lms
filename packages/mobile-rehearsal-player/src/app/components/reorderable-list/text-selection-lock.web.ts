// The app's TypeScript config has no DOM types, so the few members used here
// are described locally (the same way the web renderers reach browser globals).
type BrowserGlobals = {
  document?: { body: { style: { userSelect: string } } };
  getSelection?: () => { removeAllRanges: () => void } | null;
};

// A drag sweeps the pointer across the rows' text, which browsers treat as
// selecting it; the lock turns selection off on the page for the drag's length.
export const lockTextSelection = (): (() => void) => {
  const browser = globalThis as BrowserGlobals;
  const style = browser.document?.body.style;

  if (!style) {
    return () => undefined;
  }

  const previous = style.userSelect;

  style.userSelect = 'none';
  browser.getSelection?.()?.removeAllRanges();

  return () => {
    style.userSelect = previous;
  };
};
