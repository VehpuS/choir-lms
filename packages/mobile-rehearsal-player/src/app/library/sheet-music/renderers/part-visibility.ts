import type {
  ResolvedPartSelection,
  ScorePart,
} from '@org/audio-library-models';

/**
 * One flag per score part, in score order: true when the part is shown.
 * Renderers apply it to their own instrument list by position, because the
 * part list and the renderer's instruments come from the same file.
 */
export const resolveVisibilityFlags = (
  parts: readonly ScorePart[],
  resolved: Pick<ResolvedPartSelection, 'visible'>,
): boolean[] => {
  const visibleIndexes = new Set(resolved.visible.map((part) => part.index));

  return parts.map((part) => visibleIndexes.has(part.index));
};
