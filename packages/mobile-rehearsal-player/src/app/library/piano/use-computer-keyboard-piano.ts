import { useEffect, useRef } from 'react';

import { createComputerKeyboard } from './computer-keyboard';

type KeyEventLike = {
  code: string;
  repeat: boolean;
  ctrlKey: boolean;
  metaKey: boolean;
  altKey: boolean;
  target: unknown;
  preventDefault: () => void;
};

type KeyTarget = {
  addEventListener(type: string, listener: (event: never) => void): void;
  removeEventListener(type: string, listener: (event: never) => void): void;
};

type ElementLike = { tagName?: string; isContentEditable?: boolean };

const EDITABLE_TAGS = new Set(['INPUT', 'TEXTAREA', 'SELECT']);

const isEditable = (target: unknown): boolean => {
  const element = target as ElementLike | null;

  return (
    !!element &&
    (element.isContentEditable === true ||
      EDITABLE_TAGS.has(element.tagName ?? ''))
  );
};

/**
 * Plays the piano from the computer keyboard while it is mounted (web). The
 * app's TypeScript config carries no DOM library, so the window is described
 * structurally, like the audio context.
 */
export const useComputerKeyboardPiano = (
  press: (midi: number) => void,
  release: (midi: number) => void,
) => {
  // The handlers change identity every render; the listeners must not be
  // rebuilt (that would release held notes), so they read the latest.
  const latest = useRef({ press, release });

  latest.current = { press, release };

  useEffect(() => {
    const target = (globalThis as unknown as { window?: KeyTarget }).window;

    if (!target?.addEventListener) {
      return;
    }

    const keyboard = createComputerKeyboard({
      press: (midi) => {
        latest.current.press(midi);
      },
      release: (midi) => {
        latest.current.release(midi);
      },
    });
    const onKeyDown = (event: KeyEventLike) => {
      const handled = keyboard.keyDown({
        code: event.code,
        repeat: event.repeat,
        hasShortcutModifier: event.ctrlKey || event.metaKey || event.altKey,
        isEditableTarget: isEditable(event.target),
      });

      if (handled) {
        event.preventDefault();
      }
    };
    const onKeyUp = (event: KeyEventLike) => {
      keyboard.keyUp(event.code);
    };
    const onBlur = () => {
      keyboard.releaseAll();
    };

    target.addEventListener('keydown', onKeyDown);
    target.addEventListener('keyup', onKeyUp);
    target.addEventListener('blur', onBlur);

    return () => {
      target.removeEventListener('keydown', onKeyDown);
      target.removeEventListener('keyup', onKeyUp);
      target.removeEventListener('blur', onBlur);
      keyboard.releaseAll();
    };
  }, []);
};
