import { clamp, round } from 'es-toolkit';

/**
 * Playback shaping (design Decisions 6 and 7): speed and pitch are two
 * independent axes. Speed never changes pitch and pitch never changes tempo.
 * The model is framework-agnostic; applying it to a player belongs to the app.
 */

export const MIN_SPEED_MULTIPLIER = 0.25;
export const MAX_SPEED_MULTIPLIER = 2;
export const DEFAULT_SPEED_MULTIPLIER = 1;
/** The control's detent: speeds this close to 1.00× snap onto it. */
export const SPEED_DETENT_RADIUS = 0.02;
/** Speeds are kept to two decimals so the `0.90×` readout is exact. */
const SPEED_DECIMAL_PLACES = 2;

export const MIN_PITCH_SEMITONES = -12;
export const MAX_PITCH_SEMITONES = 12;
export const DEFAULT_PITCH_SEMITONES = 0;

/**
 * Where a tempo comes from. Only `multiplier` is implemented; `bpm` and
 * `score` are named so BPM entry and score-follow add a mode instead of
 * relocating the speed control.
 */
export const TEMPO_SOURCES = ['multiplier', 'bpm', 'score'] as const;
export type TempoSource = (typeof TEMPO_SOURCES)[number];
export const DEFAULT_TEMPO_SOURCE: TempoSource = 'multiplier';

const IMPLEMENTED_TEMPO_SOURCES: readonly TempoSource[] = ['multiplier'];

export type PlaybackShaping = {
  pitchSemitones: number;
  speedMultiplier: number;
  tempoSource: TempoSource;
};

export const DEFAULT_PLAYBACK_SHAPING: PlaybackShaping = {
  pitchSemitones: DEFAULT_PITCH_SEMITONES,
  speedMultiplier: DEFAULT_SPEED_MULTIPLIER,
  tempoSource: DEFAULT_TEMPO_SOURCE,
};

export const isTempoSource = (value: unknown): value is TempoSource => {
  return TEMPO_SOURCES.some((source) => source === value);
};

export const isTempoSourceImplemented = (source: TempoSource) => {
  return IMPLEMENTED_TEMPO_SOURCES.includes(source);
};

const toFiniteNumber = (value: unknown) => {
  return typeof value === 'number' && Number.isFinite(value) ? value : null;
};

/** Clamps to 0.25–2.00 and rounds to two decimals; non-numbers become 1.00. */
export const clampSpeedMultiplier = (value: unknown) => {
  const finiteValue = toFiniteNumber(value);

  if (finiteValue === null) {
    return DEFAULT_SPEED_MULTIPLIER;
  }

  return round(
    clamp(finiteValue, MIN_SPEED_MULTIPLIER, MAX_SPEED_MULTIPLIER),
    SPEED_DECIMAL_PLACES,
  );
};

/** Clamps like `clampSpeedMultiplier`, then snaps onto the 1.00× detent. */
export const snapSpeedMultiplier = (value: unknown) => {
  const speedMultiplier = clampSpeedMultiplier(value);

  // Rounded like the speeds themselves, so 1.02 − 1 does not miss 0.02 by
  // floating-point noise.
  const distanceFromDetent = round(
    Math.abs(speedMultiplier - DEFAULT_SPEED_MULTIPLIER),
    SPEED_DECIMAL_PLACES,
  );

  return distanceFromDetent <= SPEED_DETENT_RADIUS
    ? DEFAULT_SPEED_MULTIPLIER
    : speedMultiplier;
};

/** Rounds to whole semitones and clamps to −12…+12; non-numbers become 0. */
export const clampPitchSemitones = (value: unknown) => {
  const finiteValue = toFiniteNumber(value);

  if (finiteValue === null) {
    return DEFAULT_PITCH_SEMITONES;
  }

  // `+ 0` folds -0 (from rounding a tiny negative) into 0.
  return (
    clamp(Math.round(finiteValue), MIN_PITCH_SEMITONES, MAX_PITCH_SEMITONES) + 0
  );
};

/**
 * Builds a valid shaping from untrusted input, such as a stored library read
 * or a control event: every field is clamped, and anything missing or
 * malformed takes its default.
 */
export const normalizePlaybackShaping = (input: unknown): PlaybackShaping => {
  const record: Record<string, unknown> =
    typeof input === 'object' && input !== null
      ? (input as Record<string, unknown>)
      : {};

  return {
    pitchSemitones: clampPitchSemitones(record.pitchSemitones),
    speedMultiplier: clampSpeedMultiplier(record.speedMultiplier),
    tempoSource: isTempoSource(record.tempoSource)
      ? record.tempoSource
      : DEFAULT_TEMPO_SOURCE,
  };
};

export const isSpeedShaped = (
  shaping: Pick<PlaybackShaping, 'speedMultiplier'>,
) => {
  return shaping.speedMultiplier !== DEFAULT_SPEED_MULTIPLIER;
};

/** A pitch offset of zero is unshaped, not an active `0 st` modification. */
export const isPitchShaped = (
  shaping: Pick<PlaybackShaping, 'pitchSemitones'>,
) => {
  return shaping.pitchSemitones !== DEFAULT_PITCH_SEMITONES;
};

export const isPlaybackShapingNeutral = (
  shaping: Pick<PlaybackShaping, 'pitchSemitones' | 'speedMultiplier'>,
) => {
  return !isSpeedShaped(shaping) && !isPitchShaped(shaping);
};

const TRUE_MINUS_SIGN = '−';
const SPEED_READOUT_FRACTION_DIGITS = 2;

/** The fixed-width speed readout, always two decimals: `0.90×`, `1.00×`. */
export const formatSpeedMultiplier = (speedMultiplier: number) => {
  return `${clampSpeedMultiplier(speedMultiplier).toFixed(SPEED_READOUT_FRACTION_DIGITS)}×`;
};

/** The pitch readout with an explicit sign and a true minus: `+3 st`, `−2 st`. */
export const formatPitchSemitones = (pitchSemitones: number) => {
  const semitones = clampPitchSemitones(pitchSemitones);

  if (semitones === 0) {
    return `0 st`;
  }

  const sign = semitones > 0 ? '+' : TRUE_MINUS_SIGN;

  return `${sign}${Math.abs(semitones)} st`;
};

/**
 * The shaped parts of a rehearsal context line, in a stable order: speed
 * first, then pitch. An axis at its default is left out, so an unshaped item
 * adds nothing and a pitch of zero never shows as an active `0 st`.
 */
export const getPlaybackShapingLabelParts = (
  shaping: Pick<PlaybackShaping, 'pitchSemitones' | 'speedMultiplier'>,
) => {
  return [
    isSpeedShaped(shaping)
      ? formatSpeedMultiplier(shaping.speedMultiplier)
      : null,
    isPitchShaped(shaping)
      ? formatPitchSemitones(shaping.pitchSemitones)
      : null,
  ].filter((part): part is string => part !== null);
};
