import {
  BLACK_KEY_HEIGHT_RATIO,
  DEFAULT_KEYBOARD_LAYOUT,
  type KeyboardLayout,
  type PianoKey,
} from './keyboard-layout';
import { MAX_PIANO_VOICES } from './piano-voice';

/**
 * The key under a point, in strip coordinates (scroll offset already added)
 * and measured from the top of the keys. Black keys win in their region
 * because they sit on top of the white ones.
 */
export const keyAtPoint = (
  x: number,
  y: number,
  keyHeight: number,
  layout: KeyboardLayout = DEFAULT_KEYBOARD_LAYOUT,
): PianoKey | null => {
  if (y < 0 || y > keyHeight || x < 0) {
    return null;
  }

  if (y <= keyHeight * BLACK_KEY_HEIGHT_RATIO) {
    const black = layout.blackKeys.find(
      (key) => x >= key.left && x < key.left + key.width,
    );

    if (black) {
      return black;
    }
  }

  return layout.whiteKeys[Math.floor(x / layout.whiteKeyWidth)] ?? null;
};

/**
 * `play`: the touch began on a key and only ever plays, never scrolls.
 * `scroll`: it began on the strip beneath the keys and only ever scrolls.
 */
export type PointerRole = 'play' | 'scroll';

export type KeyGestureHandlers = {
  press: (midi: number) => void;
  release: (midi: number) => void;
};

export type KeyGestures = {
  pointerDown: (id: number, x: number, y: number) => PointerRole;
  pointerMove: (id: number, x: number, y: number) => void;
  pointerUp: (id: number) => void;
  pointerCancel: (id: number) => void;
  /** Releases everything, for example when the overlay closes. */
  releaseAll: () => void;
};

/**
 * Maps pointer events to `press` / `release` for the keys under them. Pure,
 * with no React or audio, so it is specced with synthetic event sequences.
 * Two pointers on one key sound it once, until both let go.
 */
export const createKeyGestures = (
  handlers: KeyGestureHandlers,
  options: {
    keyHeight: () => number;
    /** Read at each touch, so the keys can be widened while the model lives. */
    layout?: () => KeyboardLayout;
    maxVoices?: number;
  },
): KeyGestures => {
  const maxVoices = options.maxVoices ?? MAX_PIANO_VOICES;
  /** The key each playing pointer holds, or null once it left the keys. */
  const held = new Map<number, number | null>();
  const scrolling = new Set<number>();
  /** Sounding keys, oldest first. */
  const sounding: number[] = [];

  const holders = (midi: number) => {
    return [...held.values()].filter((value) => value === midi).length;
  };

  const stopSounding = (midi: number) => {
    sounding.splice(sounding.indexOf(midi), 1);
    handlers.release(midi);
  };

  const dropOldest = () => {
    const oldest = sounding[0];

    for (const [id, midi] of held) {
      if (midi === oldest) {
        held.set(id, null);
      }
    }

    stopSounding(oldest);
  };

  const pressKey = (id: number, midi: number) => {
    held.set(id, midi);

    if (sounding.includes(midi)) {
      return;
    }

    if (sounding.length >= maxVoices) {
      dropOldest();
    }

    sounding.push(midi);
    handlers.press(midi);
  };

  const letGo = (id: number) => {
    const midi = held.get(id);

    held.set(id, null);

    if (midi != null && sounding.includes(midi) && holders(midi) === 0) {
      stopSounding(midi);
    }
  };

  const keyUnder = (x: number, y: number) => {
    return (
      keyAtPoint(x, y, options.keyHeight(), options.layout?.())?.midi ?? null
    );
  };

  return {
    pointerDown: (id, x, y) => {
      const midi = keyUnder(x, y);

      if (midi === null) {
        scrolling.add(id);

        return 'scroll';
      }

      pressKey(id, midi);

      return 'play';
    },
    pointerMove: (id, x, y) => {
      if (!held.has(id)) {
        return;
      }

      const next = keyUnder(x, y);

      if (next === held.get(id)) {
        return;
      }

      letGo(id);

      if (next !== null) {
        pressKey(id, next);
      }
    },
    pointerUp: (id) => {
      scrolling.delete(id);

      if (held.has(id)) {
        letGo(id);
        held.delete(id);
      }
    },
    pointerCancel: (id) => {
      scrolling.delete(id);

      if (held.has(id)) {
        letGo(id);
        held.delete(id);
      }
    },
    releaseAll: () => {
      for (const id of [...held.keys()]) {
        letGo(id);
      }

      held.clear();
      scrolling.clear();
    },
  };
};
