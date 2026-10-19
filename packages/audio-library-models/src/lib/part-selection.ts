import type { ScorePart } from './score-parts.ts';
import type { SheetMusicPartSelection } from './source-sheet-music.ts';
import { matchPreferredParts } from './part-preferences.ts';

export type PartSelectionNotice =
  /** `vocal` was chosen but no part is recognized as vocal, so all are shown. */
  | 'no-vocal-parts'
  /** A saved part is not in this file any more, so the selection reset. */
  | 'saved-parts-missing';

/**
 * What the viewer asks for: a saved selection, or `{ preferParts }` for a
 * source that has none of its own: the singer's ordered part names, then the
 * part last viewed. The second form is never stored.
 */
export type PartSelectionRequest =
  | SheetMusicPartSelection
  | { learnedPart?: string; preferParts: readonly string[] };

export type ResolvedPartSelection = {
  /** What is actually in effect after any fallback. */
  effective: 'vocal' | 'all' | 'custom';
  notices: PartSelectionNotice[];
  /** The parts to show, in score order. */
  visible: ScorePart[];
};

/**
 * Names a part for a saved `{ include }` list. Both the position and the name
 * must still match, so an edited file whose parts moved is noticed rather than
 * silently showing the wrong staves.
 */
export const scorePartKey = (
  part: Pick<ScorePart, 'index' | 'name'>,
): string => {
  return `${part.index}:${part.name}`;
};

// Anything not known to be instrumental stays: an unnamed part may be the
// voice, and hiding music is worse than showing one extra staff.
const resolveVocal = (parts: readonly ScorePart[]): ResolvedPartSelection => {
  if (!parts.some((part) => part.kind === 'vocal')) {
    return {
      effective: 'all',
      notices: ['no-vocal-parts'],
      visible: [...parts],
    };
  }

  return {
    effective: 'vocal',
    notices: [],
    visible: parts.filter((part) => part.kind !== 'instrumental'),
  };
};

// A preference the file cannot satisfy (or one that would show every staff)
// falls back to `vocal` without a notice: the singer asked for nothing on this
// source, so there is nothing to explain.
const resolvePreferredParts = (
  parts: readonly ScorePart[],
  names: readonly string[],
  learnedPart: string | undefined,
): ResolvedPartSelection => {
  const listed = matchPreferredParts(parts, names);
  const visible =
    listed.length > 0 || learnedPart === undefined
      ? listed
      : matchPreferredParts(parts, [learnedPart]);

  if (visible.length === 0 || visible.length === parts.length) {
    return { ...resolveVocal(parts), notices: [] };
  }

  return { effective: 'custom', notices: [], visible };
};

/**
 * Decides which parts of a score to show for a source's saved selection
 * (design Decision 12). No saved selection means `vocal`; a saved `include`
 * list whose parts are not all found falls back to `vocal`.
 */
export const resolvePartSelection = (
  parts: readonly ScorePart[],
  selection: PartSelectionRequest | undefined,
): ResolvedPartSelection => {
  if (parts.length === 0 || selection === 'all') {
    return { effective: 'all', notices: [], visible: [...parts] };
  }

  if (typeof selection === 'object' && 'preferParts' in selection) {
    return resolvePreferredParts(
      parts,
      selection.preferParts,
      selection.learnedPart,
    );
  }

  if (selection === undefined || selection === 'vocal') {
    return resolveVocal(parts);
  }

  const wanted = new Set(selection.include);
  const visible = parts.filter((part) => wanted.has(scorePartKey(part)));
  const foundKeys = new Set(visible.map(scorePartKey));

  if ([...wanted].every((key) => foundKeys.has(key))) {
    return { effective: 'custom', notices: [], visible };
  }

  const fallback = resolveVocal(parts);

  return { ...fallback, notices: ['saved-parts-missing', ...fallback.notices] };
};
