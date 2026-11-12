import { useEffect } from 'react';

import { shouldResetPageScroll } from './model';

// The app's TypeScript config carries no DOM library, so the slice of the DOM
// used here is described structurally.
type Listenable = {
  addEventListener(type: string, listener: () => void): void;
  removeEventListener(type: string, listener: () => void): void;
};
type GuardWindow = Listenable & {
  document?: Listenable & {
    activeElement: { isContentEditable?: boolean; tagName?: string } | null;
  };
  scrollTo(x: number, y: number): void;
  scrollX: number;
  scrollY: number;
  visualViewport?: Listenable | null;
};

const EDITABLE_TAGS = new Set(['INPUT', 'TEXTAREA']);
/** Window events after which a home-screen web app may have been moved. */
const WINDOW_EVENTS = ['scroll', 'resize', 'orientationchange', 'pageshow'];
/** Lets iOS finish a rotation or toolbar change before the page is read. */
const SETTLE_DELAY_MS = 120;

/**
 * Puts the page back at 0, 0 whenever it has been scrolled. The body is
 * `overflow: hidden`, so a page that iOS shifted in the home-screen web app
 * (after a rotation, a focus or the sheet closing) could not be scrolled back
 * by the person and stayed that way as a gap at the top, until the next
 * rotation. Not while a text field has focus: iOS pans the page for the
 * keyboard then, and the keyboard-safe sheets rely on it.
 */
export const usePageScrollGuard = (): void => {
  useEffect(() => {
    const win = globalThis as unknown as GuardWindow;

    if (typeof win.scrollTo !== 'function') {
      return undefined;
    }

    const restore = () => {
      const active = win.document?.activeElement;

      if (
        shouldResetPageScroll({
          isEditing: Boolean(
            active &&
            (active.isContentEditable ||
              EDITABLE_TAGS.has(active.tagName ?? '')),
          ),
          scrollX: win.scrollX,
          scrollY: win.scrollY,
        })
      ) {
        win.scrollTo(0, 0);
      }
    };
    // Straight away, and once more after the browser has settled: a rotation
    // reports its new size and offset a moment after the event.
    let timer: ReturnType<typeof setTimeout> | undefined;
    const onChange = () => {
      restore();
      clearTimeout(timer);
      timer = setTimeout(restore, SETTLE_DELAY_MS);
    };

    WINDOW_EVENTS.forEach((type) => {
      win.addEventListener(type, onChange);
    });
    win.visualViewport?.addEventListener('resize', onChange);
    win.document?.addEventListener('visibilitychange', onChange);
    onChange();

    return () => {
      clearTimeout(timer);
      WINDOW_EVENTS.forEach((type) => {
        win.removeEventListener(type, onChange);
      });
      win.visualViewport?.removeEventListener('resize', onChange);
      win.document?.removeEventListener('visibilitychange', onChange);
    };
  }, []);
};
