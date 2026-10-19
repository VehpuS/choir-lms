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
