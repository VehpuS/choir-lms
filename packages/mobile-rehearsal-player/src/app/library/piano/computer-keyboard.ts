import {
  MIDDLE_C_MIDI,
  PIANO_HIGHEST_MIDI,
  PIANO_LOWEST_MIDI,
} from '@org/audio-library-models';

const SEMITONES_PER_OCTAVE = 12;
/** How many octaves the shift keys move the home row from middle C. */
export const MAX_OCTAVE_SHIFT = 3;
const OCTAVE_DOWN_CODE = 'KeyZ';
const OCTAVE_UP_CODE = 'KeyX';

/**
 * Semitones above the home C for each physical key (`KeyboardEvent.code`, so
 * the layout follows key position on QWERTY and AZERTY alike): the home row
 * plays the white keys and the row above plays the black keys between them.
 */
const SEMITONES_BY_CODE: Readonly<Record<string, number>> = {
  KeyA: 0,
  KeyW: 1,
  KeyS: 2,
  KeyE: 3,
  KeyD: 4,
  KeyF: 5,
  KeyT: 6,
  KeyG: 7,
  KeyY: 8,
  KeyH: 9,
  KeyU: 10,
  KeyJ: 11,
  KeyK: 12,
  KeyO: 13,
  KeyL: 14,
  KeyP: 15,
  Semicolon: 16,
};

export type ComputerKeyDown = {
  code: string;
  /** Auto-repeat of a held key; it must not retrigger the note. */
  repeat: boolean;
  /** Ctrl, Meta, or Alt is held: a browser or app shortcut, not a note. */
  hasShortcutModifier: boolean;
  /** The focus is in a text field, where letters are typing. */
  isEditableTarget: boolean;
};

export type ComputerKeyboardHandlers = {
  press: (midi: number) => void;
  release: (midi: number) => void;
};

export type ComputerKeyboard = {
  /** Returns true when the key was a piano key, so the caller can stop the default. */
  keyDown: (event: ComputerKeyDown) => boolean;
  /** Returns true when the key was holding a note. */
  keyUp: (code: string) => boolean;
  releaseAll: () => void;
};

/**
 * Plays the piano from the computer keyboard. A held key releases the note it
 * started even if the octave moved meanwhile.
 */
export const createComputerKeyboard = ({
  press,
  release,
}: ComputerKeyboardHandlers): ComputerKeyboard => {
  const held = new Map<string, number>();
  let octaveShift = 0;

  const shiftOctave = (direction: number) => {
    octaveShift = Math.min(
      Math.max(octaveShift + direction, -MAX_OCTAVE_SHIFT),
      MAX_OCTAVE_SHIFT,
    );
  };

  return {
    keyDown: ({ code, repeat, hasShortcutModifier, isEditableTarget }) => {
      if (hasShortcutModifier || isEditableTarget) {
        return false;
      }

      if (code === OCTAVE_DOWN_CODE || code === OCTAVE_UP_CODE) {
        if (!repeat) {
          shiftOctave(code === OCTAVE_UP_CODE ? 1 : -1);
        }

        return true;
      }

      const semitones = SEMITONES_BY_CODE[code];

      if (semitones === undefined) {
        return false;
      }

      const midi =
        MIDDLE_C_MIDI + octaveShift * SEMITONES_PER_OCTAVE + semitones;

      if (midi < PIANO_LOWEST_MIDI || midi > PIANO_HIGHEST_MIDI) {
        return true;
      }

      if (!repeat && !held.has(code)) {
        held.set(code, midi);
        press(midi);
      }

      return true;
    },
    keyUp: (code) => {
      const midi = held.get(code);

      if (midi === undefined) {
        return false;
      }

      held.delete(code);
      release(midi);

      return true;
    },
    releaseAll: () => {
      held.forEach((midi) => {
        release(midi);
      });
      held.clear();
    },
  };
};
