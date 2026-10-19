import {
  classifyVoiceSection,
  VOICE_SECTION_LABELS,
  VOICE_SECTIONS,
} from './voice-section.ts';
import type { ScorePart } from './score-parts.ts';

export const MAX_PART_PREFERENCES = 8;
export const MAX_PART_NAME_LENGTH = 40;

/** The built-in choices offered next to free text, in the order shown. */
export const PRESET_PART_NAMES: readonly string[] = VOICE_SECTIONS.map(
  (section) => VOICE_SECTION_LABELS[section],
);

const NON_ALPHANUMERIC_RUN_PATTERN = /[^\p{L}\p{N}]+/gu;
const DIGITS_ONLY_PATTERN = /^\d+$/;

/** Case, punctuation, and spacing do not distinguish parts; digits do. */
export const normalizePartName = (name: string): string => {
  return name.toLowerCase().replace(NON_ALPHANUMERIC_RUN_PATTERN, ' ').trim();
};

const wordsIgnoringNumbers = (normalized: string): string[] => {
  return normalized
    .split(' ')
    .filter((word) => word.length > 0 && !DIGITS_ONLY_PATTERN.test(word));
};

/** Trims, drops blanks and duplicates (by normalized name), and caps the list. */
export const sanitizePartPreferences = (value: unknown): string[] => {
  if (!Array.isArray(value)) {
    return [];
  }

  const seen = new Set<string>();
  const names: string[] = [];

  for (const entry of value) {
    if (typeof entry !== 'string') {
      continue;
    }

    const name = entry.trim().slice(0, MAX_PART_NAME_LENGTH).trim();
    const key = normalizePartName(name);

    if (key.length === 0 || seen.has(key)) {
      continue;
    }

    seen.add(key);
    names.push(name);
  }

  return names.slice(0, MAX_PART_PREFERENCES);
};

export const hasPartPreference = (
  names: readonly string[],
  name: string,
): boolean => {
  const key = normalizePartName(name);

  return names.some((existing) => normalizePartName(existing) === key);
};

/** Puts a name first (moving it when already listed), within the cap. */
export const addPartPreferenceFirst = (
  names: readonly string[],
  name: string,
): string[] => {
  return sanitizePartPreferences([name, ...names]);
};

/** Adds a name last, keeping an existing entry where it is. */
export const addPartPreferenceLast = (
  names: readonly string[],
  name: string,
): string[] => {
  return sanitizePartPreferences([...names, name]);
};

export const removePartPreference = (
  names: readonly string[],
  name: string,
): string[] => {
  const key = normalizePartName(name);

  return names.filter((existing) => normalizePartName(existing) !== key);
};

const matchesPrecisely = (part: ScorePart, key: string): boolean => {
  return normalizePartName(part.name) === key;
};

// A soft match is the same section by alias (`A.`, `Alto 2` for `Alto`) or the
// same words ignoring numbers (`V7.0-Alto` for `Alto`). Instrumental parts are
// never suggested; naming one exactly is still an exact match.
const matchesSoftly = (part: ScorePart, name: string): boolean => {
  if (part.kind === 'instrumental') {
    return false;
  }

  const wantedSection = classifyVoiceSection({ kind: 'vocal', name });

  if (
    wantedSection !== undefined &&
    wantedSection === classifyVoiceSection(part)
  ) {
    return true;
  }

  const wanted = wordsIgnoringNumbers(normalizePartName(name));
  const available = new Set(wordsIgnoringNumbers(normalizePartName(part.name)));

  return wanted.length > 0 && wanted.every((word) => available.has(word));
};

/**
 * The parts for the first preferred name that matches, in score order, or an
 * empty list. Every name is tried for an exact match before any name is tried
 * softly, so with `Alto`, `Alto 2` listed in that order a file that has `Alto
 * 1` and `Alto 2` shows `Alto 2` (the exact match), and only a file with
 * neither falls back to a soft match.
 */
export const matchPreferredParts = (
  parts: readonly ScorePart[],
  names: readonly string[],
): ScorePart[] => {
  const keyed = names.map((name) => ({ key: normalizePartName(name), name }));

  for (const { key } of keyed) {
    const exact =
      key.length > 0 ? parts.filter((part) => matchesPrecisely(part, key)) : [];

    if (exact.length > 0) {
      return exact;
    }
  }

  for (const { name } of keyed) {
    const soft = parts.filter((part) => matchesSoftly(part, name));

    if (soft.length > 0) {
      return soft;
    }
  }

  return [];
};
