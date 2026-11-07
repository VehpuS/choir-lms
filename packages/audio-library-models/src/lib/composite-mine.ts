import type { CompositeStem } from './composite-track.ts';
import { matchPreferredParts } from './part-preferences.ts';
import type { ScorePart } from './score-parts.ts';

/**
 * Which stem is the user's part (composite-tracks design Decision 2): one stem
 * at most, chosen automatically from the user's part preferences by the stem
 * name, then switchable by hand.
 */

// A stem name is matched like a score part's name, so `Alto 2` meets `Alto`.
const stemAsPart = (stem: CompositeStem, index: number): ScorePart => ({
  id: stem.id,
  index,
  kind: 'vocal',
  name: stem.name,
});

/**
 * The stem a part preference points at, or undefined when none does. With
 * several candidates the first preferred name decides (an exact name beats a
 * soft match), then the first stem in composite order.
 */
export const suggestMineStemId = (
  stems: readonly Pick<
    CompositeStem,
    'id' | 'name' | 'trackId' | 'offsetMs' | 'mine'
  >[],
  partPreferences: readonly string[],
): string | undefined => {
  const parts = stems.map((stem, index) => stemAsPart(stem, index));

  return matchPreferredParts(parts, partPreferences)[0]?.id;
};

/** Marks the suggested stem and clears the others; nothing is marked without a match. */
export const markMineStem = (
  stems: readonly CompositeStem[],
  partPreferences: readonly string[],
): CompositeStem[] => {
  const mineId = suggestMineStemId(stems, partPreferences);

  return stems.map((stem) => ({ ...stem, mine: stem.id === mineId }));
};

/**
 * `This is my part` switched by hand. Switching a stem on moves the mark from
 * any other stem (only one is mine); switching it off leaves none marked.
 */
export const setStemMine = (
  stems: readonly CompositeStem[],
  stemId: string,
  mine: boolean,
): CompositeStem[] => {
  return stems.map((stem) => {
    if (stem.id === stemId) {
      return { ...stem, mine };
    }

    return mine ? { ...stem, mine: false } : stem;
  });
};

export const findMineStem = (
  stems: readonly CompositeStem[],
): CompositeStem | undefined => {
  return stems.find((stem) => stem.mine);
};
