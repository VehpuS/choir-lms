import { useEffect, useRef } from 'react';

import { appTheme } from '../../../utils/theme';
import {
  nearestNotehead,
  readNoteheadBoxes,
  remainingAudibleMs,
} from '../renderers/score-note-hit-test';
import { NOTE_MIDI_ATTRIBUTE } from '../renderers/score-note-tags';

// The app's TypeScript config carries no DOM library, so the slice of the DOM
// used here is described structurally.
type PointerLike = {
  button?: number;
  clientX: number;
  clientY: number;
  pointerId: number;
};
type NoteheadElement = {
  getAttribute(name: string): string | null;
  getBoundingClientRect(): {
    bottom: number;
    left: number;
    right: number;
    top: number;
  };
  querySelectorAll(selector: string): ArrayLike<{ style: { fill: string } }>;
};
export type TapHost = {
  addEventListener(type: string, listener: (event: PointerLike) => void): void;
  querySelectorAll(selector: string): ArrayLike<NoteheadElement>;
  removeEventListener(
    type: string,
    listener: (event: PointerLike) => void,
  ): void;
};
type TapTarget = {
  addEventListener(type: string, listener: (event: PointerLike) => void): void;
  removeEventListener(
    type: string,
    listener: (event: PointerLike) => void,
  ): void;
};

const NOTEHEAD_SELECTOR = `[${NOTE_MIDI_ATTRIBUTE}]`;
const HIGHLIGHT_FILL = appTheme.colors.accent;
const LEFT_BUTTON = 0;

type HeldNote = {
  head: NoteheadElement;
  midi: number;
  pressedAt: number;
  timer?: ReturnType<typeof setTimeout>;
};

const paintHead = (head: NoteheadElement, fill: string) => {
  Array.from(head.querySelectorAll('path')).forEach((path) => {
    path.style.fill = fill;
  });
};

/** The notehead a point lands on (or near enough to sound), if any. */
export const noteheadAtPoint = (host: TapHost, x: number, y: number) => {
  const heads = Array.from(host.querySelectorAll(NOTEHEAD_SELECTOR));

  return nearestNotehead(readNoteheadBoxes(heads, NOTE_MIDI_ATTRIBUTE), x, y);
};

/**
 * Taps on a drawn notehead sound its pitch while the finger is down (at least
 * 350 ms) and highlight the head. The heads are tagged by the renderer with
 * their sounding pitch (`data-midi`), so a tap is answered from the DOM alone.
 */
export const useScoreNoteTaps = (
  host: TapHost | null,
  options: {
    isEnabled: boolean;
    press: (midi: number) => void;
    release: (midi: number) => void;
  },
) => {
  const latest = useRef(options);

  latest.current = options;

  useEffect(() => {
    if (!host || !options.isEnabled) {
      return undefined;
    }

    // The pointer up may land anywhere once the finger has moved on.
    const target = (host as unknown as { ownerDocument: TapTarget })
      .ownerDocument;
    const held = new Map<number, HeldNote>();

    const letGo = (note: HeldNote) => {
      latest.current.release(note.midi);
      paintHead(note.head, '');
    };

    const onDown = (event: PointerLike) => {
      if (event.button !== undefined && event.button !== LEFT_BUTTON) {
        return;
      }

      const hit = noteheadAtPoint(host, event.clientX, event.clientY);

      if (!hit) {
        return;
      }

      held.set(event.pointerId, {
        head: hit.head,
        midi: hit.midi,
        pressedAt: Date.now(),
      });
      latest.current.press(hit.midi);
      paintHead(hit.head, HIGHLIGHT_FILL);
    };

    const onUp = (event: PointerLike) => {
      const note = held.get(event.pointerId);

      if (!note) {
        return;
      }

      const wait = remainingAudibleMs(note.pressedAt, Date.now());

      held.delete(event.pointerId);

      if (wait === 0) {
        letGo(note);
        return;
      }

      // A quick tap still sounds long enough to be heard as a pitch.
      held.set(-event.pointerId - 1, note);
      note.timer = setTimeout(() => {
        held.delete(-event.pointerId - 1);
        letGo(note);
      }, wait);
    };

    host.addEventListener('pointerdown', onDown);
    target.addEventListener('pointerup', onUp);
    target.addEventListener('pointercancel', onUp);

    return () => {
      host.removeEventListener('pointerdown', onDown);
      target.removeEventListener('pointerup', onUp);
      target.removeEventListener('pointercancel', onUp);
      held.forEach((note) => {
        clearTimeout(note.timer);
        letGo(note);
      });
    };
  }, [host, options.isEnabled]);
};
