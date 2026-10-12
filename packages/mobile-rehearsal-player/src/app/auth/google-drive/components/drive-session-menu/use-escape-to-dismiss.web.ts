import { useEffect } from 'react';

const ESCAPE_KEY = 'Escape';

type KeyEventTarget = {
  addEventListener(type: 'keydown', listener: (event: KeyEvent) => void): void;
  removeEventListener(
    type: 'keydown',
    listener: (event: KeyEvent) => void,
  ): void;
};

type KeyEvent = { key: string };

// Closes an open popover on Escape. The target is injectable so the listener
// wiring can be tested without a browser.
export const subscribeToEscape = (
  target: KeyEventTarget,
  onDismiss: () => void,
) => {
  const handleKeyDown = (event: KeyEvent) => {
    if (event.key === ESCAPE_KEY) {
      onDismiss();
    }
  };

  target.addEventListener('keydown', handleKeyDown);

  return () => target.removeEventListener('keydown', handleKeyDown);
};

export const useEscapeToDismiss = (
  isActive: boolean,
  onDismiss: () => void,
) => {
  useEffect(() => {
    if (!isActive) {
      return undefined;
    }

    // This project's TypeScript config has no DOM lib, as in the other `.web`
    // files, so the browser's `document` is read off `globalThis`.
    const { document } = globalThis as unknown as { document?: KeyEventTarget };

    return document ? subscribeToEscape(document, onDismiss) : undefined;
  }, [isActive, onDismiss]);
};
