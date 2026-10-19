/** A drawn notehead's box in the same coordinates as the pointer. */
export type NoteheadBox = {
  bottom: number;
  left: number;
  midi: number;
  right: number;
  top: number;
};

/** How far from a notehead a tap still counts, in pixels. */
export const NOTEHEAD_TAP_SLOP_PX = 12;

const distanceToBox = (box: NoteheadBox, x: number, y: number) => {
  const dx = Math.max(box.left - x, 0, x - box.right);
  const dy = Math.max(box.top - y, 0, y - box.bottom);

  return Math.hypot(dx, dy);
};

/**
 * The notehead a tap at (x, y) is for: the nearest one within the slop, so a
 * small notehead at a low zoom is still easy to hit. Returns undefined for a
 * tap on empty staff.
 */
export const nearestNotehead = <T extends NoteheadBox>(
  boxes: readonly T[],
  x: number,
  y: number,
  slop: number = NOTEHEAD_TAP_SLOP_PX,
): T | undefined => {
  let nearest: T | undefined;
  let nearestDistance = Number.POSITIVE_INFINITY;

  for (const box of boxes) {
    const distance = distanceToBox(box, x, y);

    if (distance <= slop && distance < nearestDistance) {
      nearest = box;
      nearestDistance = distance;
    }
  }

  return nearest;
};

/** A tapped note sounds at least this long, even for a very quick tap. */
export const MIN_TAPPED_NOTE_MS = 350;

/** How much longer a note must sound after the finger lifts, or 0 if none. */
export const remainingAudibleMs = (
  pressedAt: number,
  releasedAt: number,
  minimum: number = MIN_TAPPED_NOTE_MS,
): number => {
  return Math.max(minimum - (releasedAt - pressedAt), 0);
};

/** The slice of a tagged notehead element needed to build its box. */
export type TaggedNotehead = {
  getAttribute(name: string): string | null;
  getBoundingClientRect(): {
    bottom: number;
    left: number;
    right: number;
    top: number;
  };
};

/**
 * Boxes for the noteheads whose tag reads as a pitch. The rect's fields are
 * copied one by one: a browser `DOMRect` keeps them as prototype getters, so
 * spreading it yields an empty object.
 */
export const readNoteheadBoxes = <T extends TaggedNotehead>(
  heads: readonly T[],
  attribute: string,
): (NoteheadBox & { head: T })[] => {
  return heads.flatMap((head) => {
    const tag = head.getAttribute(attribute);
    // `Number(null)` and `Number('')` are 0, which is not a pitch.
    const midi = tag === null || tag.trim() === '' ? NaN : Number(tag);

    if (!Number.isFinite(midi)) {
      return [];
    }

    const rect = head.getBoundingClientRect();

    return [
      {
        bottom: rect.bottom,
        head,
        left: rect.left,
        midi,
        right: rect.right,
        top: rect.top,
      },
    ];
  });
};
