import { clamp, isString, round, uniqBy } from 'es-toolkit';

import {
  parseSourceSheetMusic,
  type SheetMusicSource,
} from './source-sheet-music.ts';
import { parseTrackMarkers, type TrackMarker } from './track-markers.ts';
import { classifyVoiceSection, VOICE_SECTION_LABELS } from './voice-section.ts';

/**
 * A composite track references two or more library tracks as stems plus a
 * mix, and stores references only, never audio (composite-tracks design
 * Decision 1). Times are milliseconds on the composite's shared timeline.
 */

export const MIN_COMPOSITE_STEMS = 2;
export const MIN_STEM_VOLUME = 0;
export const MAX_STEM_VOLUME = 150;
export const DEFAULT_STEM_VOLUME = 100;
/** Stem lengths closer than this are treated as the same length (design Decision 3). */
export const STEM_LENGTH_TOLERANCE_MS = 1000;

const MS_PER_SECOND = 1000;
const MIN_ID_LENGTH = 1;
const WHITESPACE_RUN_PATTERN = /\s+/g;

/** One stem's level in a mix: 0 to 150 percent, with mute and solo. */
export type StemLevel = {
  volume: number;
  muted: boolean;
  soloed: boolean;
};

/** A mix is the levels of the stems it names; a stem it does not name plays at the default. */
export type CompositeMix = {
  levels: Record<string, StemLevel>;
};

export type CompositeMixPreset = {
  id: string;
  name: string;
  mix: CompositeMix;
};

export type CompositeStem = {
  id: string;
  /** The library track this stem plays; the track may later be missing. */
  trackId: string;
  name: string;
  /** Later when positive, earlier (start trimmed) when negative. */
  offsetMs: number;
  /** Whether this is the user's own part (`This is my part`). */
  mine: boolean;
};

export type CompositeTrack = {
  id: string;
  name: string;
  stems: CompositeStem[];
  defaultMix: CompositeMix;
  presets: CompositeMixPreset[];
  /** Sheet music added to the composite itself, beyond what the stems link. */
  sheetMusic?: SheetMusicSource[];
  /** Named points in composite time; stems' markers are never shown (composite-tracks spec). */
  markers?: TrackMarker[];
  /** The stem whose lyrics were picked last. */
  lyricsStemId?: string;
  createdAt: string;
};

const isRecord = (value: unknown): value is Record<string, unknown> => {
  return typeof value === 'object' && value !== null;
};

const isNonEmptyString = (value: unknown): value is string => {
  return isString(value) && value.length >= MIN_ID_LENGTH;
};

const collapseWhitespace = (text: string): string => {
  return text.replace(WHITESPACE_RUN_PATTERN, ' ').trim();
};

/**
 * A stem's default name: the section label when the track name names exactly
 * one choir section, otherwise the track name. Tags are never read. The
 * classifier already treats a name with several sections as none.
 */
export const guessStemName = (trackName: string): string => {
  const section = classifyVoiceSection({
    name: trackName,
    kind: 'vocal',
    instrument: undefined,
  });

  return section === undefined
    ? collapseWhitespace(trackName)
    : VOICE_SECTION_LABELS[section];
};

/** Whether the default name came from the track name rather than a section. */
export const isStemNameGuessedFromSection = (trackName: string): boolean => {
  return (
    classifyVoiceSection({
      name: trackName,
      kind: 'vocal',
      instrument: undefined,
    }) !== undefined
  );
};

export type StemTiming = {
  offsetMs: number;
  /** Undefined while the stem's duration is not known yet. */
  durationMs: number | undefined;
};

/** Where a stem ends on the composite timeline (offset plus its length). */
export const getStemEndMs = (stem: StemTiming): number | undefined => {
  return stem.durationMs === undefined
    ? undefined
    : Math.max(0, stem.offsetMs + stem.durationMs);
};

/**
 * The composite's length: the longest stem counting offsets. Undefined while
 * any duration is unknown, since creation waits for them (design Decision 3).
 */
export const getCompositeDurationMs = (
  stems: readonly StemTiming[],
): number | undefined => {
  const ends = stems.map(getStemEndMs);

  if (ends.length === 0 || ends.some((end) => end === undefined)) {
    return undefined;
  }

  return Math.max(...(ends as number[]));
};

/**
 * How much of the stem's start is not played: a negative offset trims that
 * much, a positive offset trims nothing.
 */
export const getStemTrimMs = (offsetMs: number): number => {
  return Math.max(0, -offsetMs);
};

/** Silence before the stem begins on the timeline (positive offsets only). */
export const getStemPaddingMs = (offsetMs: number): number => {
  return Math.max(0, offsetMs);
};

export type StemLengthCheck = {
  /** Every duration is known and within the tolerance of the others. */
  matches: boolean;
  /** Durations differ by more than the tolerance (needs the padding warning). */
  differs: boolean;
  /** Some duration is not known yet. */
  waiting: boolean;
  /** Stems shorter than the longest by more than the tolerance. */
  shorterCount: number;
  spreadMs: number;
};

/** The one-second length-difference check used by the bulk bar and the create sheet. */
export const checkStemLengths = (
  durationsMs: ReadonlyArray<number | undefined>,
  toleranceMs: number = STEM_LENGTH_TOLERANCE_MS,
): StemLengthCheck => {
  const known = durationsMs.filter((ms): ms is number => ms !== undefined);

  if (known.length < durationsMs.length || known.length === 0) {
    return {
      matches: false,
      differs: false,
      waiting: true,
      shorterCount: 0,
      spreadMs: 0,
    };
  }

  const longest = Math.max(...known);
  const spreadMs = longest - Math.min(...known);
  const shorterCount = known.filter((ms) => longest - ms > toleranceMs).length;

  return {
    matches: spreadMs <= toleranceMs,
    differs: spreadMs > toleranceMs,
    waiting: false,
    shorterCount,
    spreadMs,
  };
};

/** Whole seconds, for the "shorter by 6 s" wording. */
export const stemLengthDifferenceSeconds = (spreadMs: number): number => {
  return round(spreadMs / MS_PER_SECOND);
};

export const clampStemVolume = (volume: number): number => {
  return Number.isFinite(volume)
    ? clamp(round(volume), MIN_STEM_VOLUME, MAX_STEM_VOLUME)
    : DEFAULT_STEM_VOLUME;
};

export const DEFAULT_STEM_LEVEL: StemLevel = {
  volume: DEFAULT_STEM_VOLUME,
  muted: false,
  soloed: false,
};

const parseStemLevel = (value: unknown): StemLevel | undefined => {
  if (!isRecord(value)) {
    return undefined;
  }

  return {
    volume:
      typeof value.volume === 'number'
        ? clampStemVolume(value.volume)
        : DEFAULT_STEM_VOLUME,
    muted: value.muted === true,
    soloed: value.soloed === true,
  };
};

export const parseCompositeMix = (value: unknown): CompositeMix => {
  const levels: Record<string, StemLevel> = {};

  if (isRecord(value) && isRecord(value.levels)) {
    for (const [stemId, level] of Object.entries(value.levels)) {
      const parsed = parseStemLevel(level);

      if (parsed) {
        levels[stemId] = parsed;
      }
    }
  }

  return { levels };
};

const parseCompositeStem = (value: unknown): CompositeStem | undefined => {
  if (
    !isRecord(value) ||
    !isNonEmptyString(value.id) ||
    !isNonEmptyString(value.trackId)
  ) {
    return undefined;
  }

  const name = isString(value.name) ? collapseWhitespace(value.name) : '';

  return {
    id: value.id,
    trackId: value.trackId,
    name,
    offsetMs:
      typeof value.offsetMs === 'number' && Number.isFinite(value.offsetMs)
        ? Math.round(value.offsetMs)
        : 0,
    mine: value.mine === true,
  };
};

const parsePreset = (value: unknown): CompositeMixPreset | undefined => {
  if (
    !isRecord(value) ||
    !isNonEmptyString(value.id) ||
    !isNonEmptyString(value.name)
  ) {
    return undefined;
  }

  return {
    id: value.id,
    name: collapseWhitespace(value.name),
    mix: parseCompositeMix(value.mix),
  };
};

/**
 * Reads a stored composite from untrusted input. Returns `null` for a record
 * that cannot be a composite (no id, no name, fewer than two usable stems), so
 * one bad record never fails the read of the whole collection. Malformed or
 * duplicate stems and presets are dropped.
 */
export const parseCompositeTrack = (value: unknown): CompositeTrack | null => {
  if (
    !isRecord(value) ||
    !isNonEmptyString(value.id) ||
    !isNonEmptyString(value.name) ||
    !Array.isArray(value.stems)
  ) {
    return null;
  }

  const stems = uniqBy(
    value.stems.flatMap((entry) => parseCompositeStem(entry) ?? []),
    (stem) => stem.id,
  ).map((stem) => ({
    ...stem,
    name: stem.name.length > 0 ? stem.name : 'Stem',
  }));

  if (stems.length < MIN_COMPOSITE_STEMS) {
    return null;
  }

  const stemIds = new Set(stems.map((stem) => stem.id));
  const presets = uniqBy(
    Array.isArray(value.presets)
      ? value.presets.flatMap((entry) => parsePreset(entry) ?? [])
      : [],
    (preset) => preset.id,
  );
  const sheetMusic = parseSourceSheetMusic(value.sheetMusic);
  const markers = parseTrackMarkers(value.markers);

  return {
    id: value.id,
    name: collapseWhitespace(value.name),
    stems,
    defaultMix: parseCompositeMix(value.defaultMix),
    presets,
    ...(sheetMusic ? { sheetMusic } : {}),
    ...(markers ? { markers } : {}),
    ...(isString(value.lyricsStemId) && stemIds.has(value.lyricsStemId)
      ? { lyricsStemId: value.lyricsStemId }
      : {}),
    createdAt: isString(value.createdAt) ? value.createdAt : '',
  };
};
