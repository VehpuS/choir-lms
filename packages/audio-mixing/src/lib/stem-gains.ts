import {
  DEFAULT_STEM_LEVEL,
  MAX_STEM_VOLUME,
  type CompositeMix,
  type StemLevel,
} from '@org/audio-library-models';

const PERCENT = 100;
const SILENT = 0;

/** A stem the mix does not name plays at the default level. */
export const getStemLevel = (mix: CompositeMix, stemId: string): StemLevel => {
  return mix.levels[stemId] ?? DEFAULT_STEM_LEVEL;
};

/**
 * The linear gain of each stem (composite-tracks design Decision 7). A stem is
 * silent when it is muted, or when any stem is soloed and it is not; mute wins
 * over solo on the same stem. Otherwise the gain is volume / 100, up to 1.5.
 * Only the stems passed count, so a solo on a missing stem silences nothing.
 */
export const resolveStemGains = (
  stems: ReadonlyArray<{ id: string }>,
  mix: CompositeMix,
): Record<string, number> => {
  const anySoloed = stems.some((stem) => getStemLevel(mix, stem.id).soloed);
  const gains: Record<string, number> = {};

  for (const stem of stems) {
    const level = getStemLevel(mix, stem.id);
    const silent = level.muted || (anySoloed && !level.soloed);

    gains[stem.id] = silent
      ? SILENT
      : Math.min(MAX_STEM_VOLUME, Math.max(SILENT, level.volume)) / PERCENT;
  }

  return gains;
};
