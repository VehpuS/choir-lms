import { useEffect, useState } from 'react';

import { getKeyboardInset } from './keyboard-inset-model';

// The app's TypeScript config carries no DOM library, so the slice of the DOM
// used here is described structurally.
type VisualViewportLike = {
  addEventListener(type: string, listener: () => void): void;
  height: number;
  offsetTop: number;
  removeEventListener(type: string, listener: () => void): void;
  scale: number;
};
type FocusableLike = {
  isContentEditable?: boolean;
  scrollIntoView?: (options: { block: string }) => void;
  tagName?: string;
};
type KeyboardWindow = {
  document?: { activeElement: FocusableLike | null };
  innerHeight: number;
  visualViewport?: VisualViewportLike | null;
};

const EDITABLE_TAGS = new Set(['INPUT', 'TEXTAREA']);
/** Lets the sheet re-lay-out above the keyboard before the field is scrolled into view. */
const SCROLL_DELAY_MS = 60;

const isEditable = (element: FocusableLike | null | undefined) => {
  return Boolean(
    element &&
    (element.isContentEditable || EDITABLE_TAGS.has(element.tagName ?? '')),
  );
};

/**
 * How tall the soft keyboard is over the bottom of the window, from the visual
 * viewport. iOS Safari shrinks the visual viewport and not the layout one, so
 * a sheet anchored to the bottom (or a side sheet that fills the height) would
 * have its field under the keyboard. When the keyboard opens, the focused field
 * is also scrolled into view inside its sheet. Zero where there is no visual
 * viewport or no keyboard.
 */
export const useKeyboardInset = (): number => {
  const [inset, setInset] = useState(0);

  useEffect(() => {
    const win = globalThis as unknown as KeyboardWindow;
    const viewport = win.visualViewport;

    if (!viewport) {
      return undefined;
    }

    const update = () => {
      setInset(
        getKeyboardInset({
          layoutHeight: win.innerHeight,
          offsetTop: viewport.offsetTop,
          scale: viewport.scale,
          visualHeight: viewport.height,
        }),
      );
    };

    update();
    viewport.addEventListener('resize', update);
    viewport.addEventListener('scroll', update);

    return () => {
      viewport.removeEventListener('resize', update);
      viewport.removeEventListener('scroll', update);
    };
  }, []);

  useEffect(() => {
    if (inset === 0) {
      return undefined;
    }

    const win = globalThis as unknown as KeyboardWindow;
    const timer = setTimeout(() => {
      const active = win.document?.activeElement;

      if (isEditable(active)) {
        active?.scrollIntoView?.({ block: 'nearest' });
      }
    }, SCROLL_DELAY_MS);

    return () => {
      clearTimeout(timer);
    };
  }, [inset]);

  return inset;
};
