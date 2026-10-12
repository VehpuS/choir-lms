import type { PlacementPlanEntry } from '@org/audio-library-runtime';

/**
 * The one line a copy or move review opens on, with the rows behind a
 * disclosure so a long selection does not make a tall sheet (task 8.74):
 * `3 clash with an existing name · 1 left out`.
 */
export const getPlacementReviewSummary = (
  entries: readonly PlacementPlanEntry[],
): string => {
  const clashCount = entries.filter(
    ({ status }) => status === 'conflict',
  ).length;
  const leftOutCount = entries.filter(
    ({ status }) => status === 'invalid',
  ).length;
  const parts: string[] = [];

  if (clashCount > 0) {
    parts.push(
      `${clashCount} ${clashCount === 1 ? 'clashes' : 'clash'} with an existing name`,
    );
  }

  if (leftOutCount > 0) {
    parts.push(`${leftOutCount} can't be placed`);
  }

  return parts.join(' · ');
};

/** The disclosure's label: it names the rows and what opening them lets you do. */
export const getPlacementReviewToggleLabel = (
  entryCount: number,
  isOpen: boolean,
): string => {
  const noun = entryCount === 1 ? 'item' : 'items';

  return isOpen ? `Hide ${noun}` : `Review ${entryCount} ${noun}`;
};
