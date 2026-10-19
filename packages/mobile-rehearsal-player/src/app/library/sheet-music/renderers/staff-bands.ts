// Which staff a tap landed on, and so which part it belongs to. The renderer
// reads where each staff is drawn; this keeps the plain maths apart from it.

/** One drawn staff: where it sits from the top of the drawing, at zoom 1, in pixels. */
export type StaffBand = {
  /** Bottom edge of the staff's five lines. */
  bottom: number;
  name: string;
  /** Top edge of the staff's five lines. */
  top: number;
};

/** A tap this far above or below a staff, at zoom 1, still counts as on it. */
export const STAFF_TAP_PADDING_PX = 40;

/**
 * One name per drawn staff, top to bottom: each shown part's name repeated for
 * its staves (a piano part has two). Returns undefined when the counts do not
 * add up to the staves drawn, so a label is never put on the wrong staff.
 */
export const flattenStaffNames = (
  parts: readonly { name: string; staffCount: number }[],
  drawnStaffCount: number,
): string[] | undefined => {
  const names = parts.flatMap(({ name, staffCount }) => {
    return Array.from({ length: staffCount }, () => name);
  });

  return names.length === drawnStaffCount ? names : undefined;
};

/** Pairs each staff line's position with its part's name. */
export const buildStaffBands = (
  lines: readonly { height: number; y: number }[],
  names: readonly string[],
): StaffBand[] => {
  return lines.flatMap((line, index) => {
    const name = names[index];

    return name === undefined
      ? []
      : [{ bottom: line.y + line.height, name, top: line.y }];
  });
};

/**
 * The name of the part whose staff a tap at `y` (pixels from the top of the
 * drawing, at zoom 1) is on or just beside, or undefined for the blank space
 * above, below, or too far between staves. The nearest staff wins when the
 * padding of two overlaps.
 */
export const findPartNameAtY = (
  bands: readonly StaffBand[],
  y: number,
  padding: number = STAFF_TAP_PADDING_PX,
): string | undefined => {
  let best: { distance: number; name: string } | undefined;

  for (const band of bands) {
    const distance =
      y < band.top ? band.top - y : y > band.bottom ? y - band.bottom : 0;

    if (distance <= padding && (!best || distance < best.distance)) {
      best = { distance, name: band.name };
    }
  }

  return best?.name;
};
