import { useEffect, useRef } from 'react';

const ESCAPE_KEY = 'Escape';

type KeyEventTarget = {
  addEventListener(type: 'keydown', listener: (event: KeyEvent) => void): void;
  removeEventListener(
    type: 'keydown',
    listener: (event: KeyEvent) => void,
  ): void;
};

type KeyEvent = { key: string };

// Calls `onDismiss` on Escape. The target is injectable so the listener
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

/**
 * The open layers, oldest first. One Escape closes only the last, so a menu
 * over a sheet closes the menu and leaves the sheet for the next press. The
 * single listener exists only while at least one layer is open.
 */
export const createEscapeStack = (target: KeyEventTarget) => {
  const layers: { dismiss: () => void }[] = [];
  let unsubscribe: (() => void) | null = null;

  return {
    push: (dismiss: () => void) => {
      const layer = { dismiss };

      layers.push(layer);
      unsubscribe ??= subscribeToEscape(target, () => {
        layers[layers.length - 1]?.dismiss();
      });

      return () => {
        const index = layers.indexOf(layer);

        if (index >= 0) {
          layers.splice(index, 1);
        }

        if (layers.length === 0) {
          unsubscribe?.();
          unsubscribe = null;
        }
      };
    },
  };
};

let sharedStack: ReturnType<typeof createEscapeStack> | null = null;

const getSharedStack = () => {
  // This project's TypeScript config has no DOM lib, as in the other `.web`
  // files, so the browser's `document` is read off `globalThis`.
  const { document } = globalThis as unknown as { document?: KeyEventTarget };

  if (!sharedStack && document) {
    sharedStack = createEscapeStack(document);
  }

  return sharedStack;
};

export const useEscapeToDismiss = (
  isActive: boolean,
  onDismiss: () => void,
) => {
  // The layer keeps its place in the stack across renders that only change
  // the callback, so it reads the latest one through a ref.
  const latest = useRef(onDismiss);

  latest.current = onDismiss;

  useEffect(() => {
    if (!isActive) {
      return undefined;
    }

    return getSharedStack()?.push(() => latest.current());
  }, [isActive]);
};
