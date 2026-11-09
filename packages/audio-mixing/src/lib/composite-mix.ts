import {
  DEFAULT_STEM_VOLUME,
  clampStemVolume,
  type CompositeMix,
  type CompositeMixPreset,
  type CompositeStem,
  type StemLevel,
} from '@org/audio-library-models';

import { getStemLevel, resolveStemGains } from './stem-gains.ts';

/**
 * Presets, the default mix and the session mix of a composite (design
 * Decision 7). Everything here is pure; the store and the UI sit in the app.
 */

export const CUSTOM_MIX_NAME = 'Custom mix';
export const ALL_PARTS_PRESET_ID = 'builtin:all-parts';
export const WITHOUT_MINE_PRESET_ID = 'builtin:without-mine';
export const MINE_LOUDER_PRESET_ID = 'builtin:mine-louder';

const MINE_LOUDER_MINE_VOLUME = 150;
const MINE_LOUDER_OTHERS_VOLUME = 70;
const SUMMARY_SEPARATOR = ' · ';

type MixStem = Pick<CompositeStem, 'id' | 'name' | 'mine'>;

export type ListedMixPreset = CompositeMixPreset & { builtIn: boolean };

const levelsFor = (
  stems: readonly MixStem[],
  build: (stem: MixStem) => Partial<StemLevel>,
): CompositeMix => {
  return {
    levels: Object.fromEntries(
      stems.map((stem) => [
        stem.id,
        {
          volume: DEFAULT_STEM_VOLUME,
          muted: false,
          soloed: false,
          ...build(stem),
        },
      ]),
    ),
  };
};

/** The mix with every stem at 100%, unmuted and unsoloed. */
export const createDefaultMix = (stems: readonly MixStem[]): CompositeMix => {
  return levelsFor(stems, () => ({}));
};

/**
 * Built-in presets are computed, not stored. `Without <mine>` and `<Mine>
 * louder` need a stem marked as the user's part and are left out without one.
 */
export const getBuiltInMixPresets = (
  stems: readonly MixStem[],
): ListedMixPreset[] => {
  const presets: ListedMixPreset[] = [
    {
      id: ALL_PARTS_PRESET_ID,
      name: 'All parts',
      mix: createDefaultMix(stems),
      builtIn: true,
    },
  ];
  const mine = stems.find((stem) => stem.mine);

  if (mine) {
    presets.push(
      {
        id: WITHOUT_MINE_PRESET_ID,
        name: `Without ${mine.name}`,
        mix: levelsFor(stems, (stem) => ({ muted: stem.id === mine.id })),
        builtIn: true,
      },
      {
        id: MINE_LOUDER_PRESET_ID,
        name: `${mine.name} louder`,
        mix: levelsFor(stems, (stem) => ({
          volume:
            stem.id === mine.id
              ? MINE_LOUDER_MINE_VOLUME
              : MINE_LOUDER_OTHERS_VOLUME,
        })),
        builtIn: true,
      },
    );
  }

  return presets;
};

/** Built-in presets first, then the saved ones. */
export const listMixPresets = (composite: {
  stems: readonly MixStem[];
  presets: readonly CompositeMixPreset[];
}): ListedMixPreset[] => {
  return [
    ...getBuiltInMixPresets(composite.stems),
    ...composite.presets.map((preset) => ({ ...preset, builtIn: false })),
  ];
};

const sameLevel = (a: StemLevel, b: StemLevel): boolean => {
  return (
    clampStemVolume(a.volume) === clampStemVolume(b.volume) &&
    a.muted === b.muted &&
    a.soloed === b.soloed
  );
};

/** Equal over the given stems; a stem a mix does not name is at the default. */
export const mixesEqual = (
  stems: readonly MixStem[],
  a: CompositeMix,
  b: CompositeMix,
): boolean => {
  return stems.every((stem) =>
    sameLevel(getStemLevel(a, stem.id), getStemLevel(b, stem.id)),
  );
};

/** The preset whose levels the mix has, else `Custom mix`. */
export const describeMix = (
  stems: readonly MixStem[],
  mix: CompositeMix,
  presets: readonly ListedMixPreset[],
): string => {
  const match = presets.find((preset) => mixesEqual(stems, preset.mix, mix));

  return match?.name ?? CUSTOM_MIX_NAME;
};

/** `Without Bass · 3 of 4 sounding`: the mix's name and how many stems are audible. */
export const summarizeMix = (
  stems: readonly MixStem[],
  mix: CompositeMix,
  presets: readonly ListedMixPreset[],
): string => {
  const gains = resolveStemGains(stems, mix);
  const sounding = stems.filter((stem) => gains[stem.id] > 0).length;

  return [
    describeMix(stems, mix, presets),
    `${sounding} of ${stems.length} sounding`,
  ].join(SUMMARY_SEPARATOR);
};

/** A stem that is silent only because of the mix (muted, or not soloed). */
export const isStemSilent = (
  stems: readonly MixStem[],
  mix: CompositeMix,
  stemId: string,
): boolean => {
  return resolveStemGains(stems, mix)[stemId] === 0;
};

/** Drops levels of stems that are gone, so a saved preset naming a removed stem still applies. */
export const pruneMixToStems = (
  stems: readonly MixStem[],
  mix: CompositeMix,
): CompositeMix => {
  return {
    levels: Object.fromEntries(
      stems
        .filter((stem) => mix.levels[stem.id] !== undefined)
        .map((stem) => [stem.id, mix.levels[stem.id]]),
    ),
  };
};

/** What the listener has now, and the saved default `Reset` returns to. */
export type SessionMix = {
  mix: CompositeMix;
  savedDefault: CompositeMix;
};

export type SessionMixAction =
  | { type: 'set-volume'; stemId: string; volume: number }
  | { type: 'toggle-mute'; stemId: string }
  | { type: 'toggle-solo'; stemId: string }
  | { type: 'apply'; mix: CompositeMix }
  /** The composite's saved default changed; `reset` returns to this. */
  | { type: 'set-default'; mix: CompositeMix }
  | { type: 'reset' };

/** A session starts from the composite's default mix and resets when the item changes. */
export const startSessionMix = (composite: {
  stems: readonly MixStem[];
  defaultMix: CompositeMix;
}): SessionMix => {
  const savedDefault = pruneMixToStems(composite.stems, composite.defaultMix);

  return { mix: savedDefault, savedDefault };
};

const withLevel = (
  mix: CompositeMix,
  stemId: string,
  change: (level: StemLevel) => Partial<StemLevel>,
): CompositeMix => {
  const level = getStemLevel(mix, stemId);

  return {
    levels: { ...mix.levels, [stemId]: { ...level, ...change(level) } },
  };
};

export const reduceSessionMix = (
  state: SessionMix,
  action: SessionMixAction,
): SessionMix => {
  switch (action.type) {
    case 'set-volume':
      return {
        ...state,
        mix: withLevel(state.mix, action.stemId, () => ({
          volume: clampStemVolume(action.volume),
        })),
      };
    case 'toggle-mute':
      return {
        ...state,
        mix: withLevel(state.mix, action.stemId, (level) => ({
          muted: !level.muted,
        })),
      };
    case 'toggle-solo':
      return {
        ...state,
        mix: withLevel(state.mix, action.stemId, (level) => ({
          soloed: !level.soloed,
        })),
      };
    case 'apply':
      return { ...state, mix: action.mix };
    case 'set-default':
      return { ...state, savedDefault: action.mix };
    case 'reset':
      return { ...state, mix: state.savedDefault };
  }
};

/** Whether `Reset to the saved default` would change anything. */
export const canResetSessionMix = (
  stems: readonly MixStem[],
  state: SessionMix,
): boolean => {
  return !mixesEqual(stems, state.mix, state.savedDefault);
};
