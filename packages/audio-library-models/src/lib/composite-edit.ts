import { round } from 'es-toolkit';

import { markMineStem, setStemMine } from './composite-mine.ts';
import {
  relinkStem,
  removeStem,
  type RemoveStemResult,
} from './composite-availability.ts';
import type {
  CompositeMix,
  CompositeStem,
  CompositeTrack,
} from './composite-track.ts';

/**
 * Creating and editing a composite record (composite-tracks design Decisions 1
 * and 2). Every function is pure and returns a new record; saving is the
 * store's job.
 */

export const MAX_COMPOSITE_RECORD_NAME_LENGTH = 80;
export const MAX_STEM_RECORD_NAME_LENGTH = 40;
const WHITESPACE_RUN_PATTERN = /\s+/g;

export type CompositeDraft = {
  name: string;
  /** In the order the tracks were selected. */
  stems: ReadonlyArray<{ trackId: string; name: string }>;
};

const cleanName = (text: string, limit: number): string =>
  text.replace(WHITESPACE_RUN_PATTERN, ' ').trim().slice(0, limit);

const defaultCompositeId = (createdAt: string): string =>
  `composite-${Date.parse(createdAt) || 0}-${Math.random().toString(36).slice(2, 8)}`;

/**
 * A new composite from a draft: stems in order with stable ids, the stem that
 * the part preferences point at marked as the user's, the default mix at the
 * neutral level. Returns null when fewer than two distinct tracks remain.
 */
export const createCompositeTrack = (options: {
  draft: CompositeDraft;
  partPreferences?: readonly string[];
  createdAt?: string;
  createId?: (createdAt: string) => string;
}): CompositeTrack | null => {
  const createdAt = options.createdAt ?? new Date().toISOString();
  const seen = new Set<string>();
  const stems: CompositeStem[] = options.draft.stems
    .filter((stem) => {
      // The same track twice would only double that voice.
      if (seen.has(stem.trackId)) {
        return false;
      }

      seen.add(stem.trackId);

      return true;
    })
    .map((stem, index) => ({
      id: `stem-${index + 1}`,
      trackId: stem.trackId,
      name:
        cleanName(stem.name, MAX_STEM_RECORD_NAME_LENGTH) ||
        `Stem ${index + 1}`,
      offsetMs: 0,
      mine: false,
    }));

  if (stems.length < 2) {
    return null;
  }

  return {
    id: options.createId?.(createdAt) ?? defaultCompositeId(createdAt),
    name:
      cleanName(options.draft.name, MAX_COMPOSITE_RECORD_NAME_LENGTH) ||
      'New composite',
    stems: markMineStem(stems, options.partPreferences ?? []),
    defaultMix: { levels: {} },
    presets: [],
    createdAt,
  };
};

export const renameComposite = (
  composite: CompositeTrack,
  name: string,
): CompositeTrack => {
  const next = cleanName(name, MAX_COMPOSITE_RECORD_NAME_LENGTH);

  return next ? { ...composite, name: next } : composite;
};

const mapStem = (
  composite: CompositeTrack,
  stemId: string,
  change: (stem: CompositeStem) => CompositeStem,
): CompositeTrack => ({
  ...composite,
  stems: composite.stems.map((stem) =>
    stem.id === stemId ? change(stem) : stem,
  ),
});

/** An emptied name keeps the old one. */
export const renameCompositeStem = (
  composite: CompositeTrack,
  stemId: string,
  name: string,
): CompositeTrack => {
  const next = cleanName(name, MAX_STEM_RECORD_NAME_LENGTH);

  return next
    ? mapStem(composite, stemId, (stem) => ({ ...stem, name: next }))
    : composite;
};

/** Whole milliseconds; a value that is not a number leaves the offset alone. */
export const setCompositeStemOffset = (
  composite: CompositeTrack,
  stemId: string,
  offsetMs: number,
): CompositeTrack => {
  return Number.isFinite(offsetMs)
    ? mapStem(composite, stemId, (stem) => ({
        ...stem,
        offsetMs: round(offsetMs),
      }))
    : composite;
};

export const setCompositeStemMine = (
  composite: CompositeTrack,
  stemId: string,
  mine: boolean,
): CompositeTrack => ({
  ...composite,
  stems: setStemMine(composite.stems, stemId, mine),
});

export const relinkCompositeStem = (
  composite: CompositeTrack,
  stemId: string,
  trackId: string,
): CompositeTrack => ({
  ...composite,
  stems: relinkStem(composite.stems, stemId, trackId),
});

export type RemoveCompositeStemResult =
  | { outcome: 'removed'; composite: CompositeTrack }
  | Exclude<RemoveStemResult, { outcome: 'removed' }>;

/** `ask-delete` when only one stem would be left: the caller asks about deleting the composite. */
export const removeCompositeStem = (
  composite: CompositeTrack,
  stemId: string,
): RemoveCompositeStemResult => {
  const result = removeStem(composite.stems, stemId);

  return result.outcome === 'removed'
    ? {
        outcome: 'removed',
        composite: {
          ...composite,
          stems: result.stems,
          // A pick of a stem that is gone must not linger.
          lyricsStemId:
            composite.lyricsStemId === stemId
              ? undefined
              : composite.lyricsStemId,
        },
      }
    : result;
};

export const MAX_MIX_PRESET_NAME_LENGTH = 40;

const keepStemLevels = (
  composite: CompositeTrack,
  mix: CompositeMix,
): CompositeMix => ({
  levels: Object.fromEntries(
    composite.stems
      .filter((stem) => mix.levels[stem.id] !== undefined)
      .map((stem) => [stem.id, mix.levels[stem.id]]),
  ),
});

/**
 * Saves a mix as a named preset (composite-tracks design Decision 7). A name
 * that is already saved (ignoring case) replaces that preset's levels, so a
 * preset is never listed twice; an empty name changes nothing. `makeDefault`
 * also makes the mix the one the composite starts from.
 */
export const saveCompositeMixPreset = (
  composite: CompositeTrack,
  options: {
    name: string;
    mix: CompositeMix;
    makeDefault?: boolean;
    createId?: () => string;
  },
): CompositeTrack => {
  const name = cleanName(options.name, MAX_MIX_PRESET_NAME_LENGTH);

  if (!name) {
    return composite;
  }

  const mix = keepStemLevels(composite, options.mix);
  const sameName = (candidate: string) =>
    candidate.toLowerCase() === name.toLowerCase();
  const existing = composite.presets.find((preset) => sameName(preset.name));
  const presets = existing
    ? composite.presets.map((preset) =>
        preset === existing ? { ...preset, name, mix } : preset,
      )
    : [
        ...composite.presets,
        {
          id:
            options.createId?.() ??
            `preset-${Math.random().toString(36).slice(2, 10)}`,
          name,
          mix,
        },
      ];

  return {
    ...composite,
    presets,
    ...(options.makeDefault ? { defaultMix: mix } : {}),
  };
};

/** The mix the composite starts from each time it plays. */
export const setCompositeDefaultMix = (
  composite: CompositeTrack,
  mix: CompositeMix,
): CompositeTrack => ({
  ...composite,
  defaultMix: keepStemLevels(composite, mix),
});
