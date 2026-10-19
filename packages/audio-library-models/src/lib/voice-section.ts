import type { ScorePart } from './score-parts.ts';

export type VoiceSection =
  | 'soprano'
  | 'mezzo'
  | 'alto'
  | 'tenor'
  | 'baritone'
  | 'bass'
  | 'beatbox';

export const VOICE_SECTIONS: readonly VoiceSection[] = [
  'soprano',
  'mezzo',
  'alto',
  'tenor',
  'baritone',
  'bass',
  'beatbox',
];

export const VOICE_SECTION_LABELS: Record<VoiceSection, string> = {
  soprano: 'Soprano',
  mezzo: 'Mezzo-soprano',
  alto: 'Alto',
  tenor: 'Tenor',
  baritone: 'Baritone',
  bass: 'Bass',
  beatbox: 'Beatbox',
};

const SECTION_WORD_PATTERNS: ReadonlyArray<readonly [VoiceSection, RegExp]> = [
  ['soprano', /\b(soprano|soprani|sopr?)\b/],
  ['mezzo', /\b(mezzos?)\b/],
  ['alto', /\b(alto|alti|alt|contralto)\b/],
  ['tenor', /\b(tenor|tenori|ten)\b/],
  ['baritone', /\b(baritone|bari|bar)\b/],
  ['bass', /\b(bass|basso|bassi)\b/],
  ['beatbox', /\b(beat ?box\w*|vocal percussion)\b/],
];
// A bare voice letter as in `S`, `A.`, `T 2`; combinations such as `S/A` do not match.
const VOICE_LETTER_PATTERN = /^([satb])[\s.]*\d*$/;
const VOICE_LETTER_SECTIONS: Record<string, VoiceSection> = {
  s: 'soprano',
  a: 'alto',
  t: 'tenor',
  b: 'bass',
};
const NON_LETTER_RUN_PATTERN = /[^\p{L}\p{N}\s./&,+-]+/gu;
const SEPARATOR_RUN_PATTERN = /[_\-/&,+]+/g;
// `Mezzo-soprano` names one section, not two.
const MEZZO_SOPRANO_PATTERN = /\bmezzo\s?soprano\b/g;

export const parseVoiceSection = (value: unknown): VoiceSection | undefined => {
  return VOICE_SECTIONS.find((section) => section === value);
};

const normalize = (text: string | undefined): string => {
  return (text ?? '').toLowerCase().replace(NON_LETTER_RUN_PATTERN, ' ').trim();
};

const sectionsInClue = (clue: string): VoiceSection[] => {
  if (clue.length === 0) {
    return [];
  }

  const letter = VOICE_LETTER_PATTERN.exec(clue);

  if (letter) {
    return [VOICE_LETTER_SECTIONS[letter[1]]];
  }

  const words = clue
    .replace(SEPARATOR_RUN_PATTERN, ' ')
    .replace(MEZZO_SOPRANO_PATTERN, 'mezzo');

  return SECTION_WORD_PATTERNS.filter(([, pattern]) => pattern.test(words)).map(
    ([section]) => section,
  );
};

/**
 * The choir section a part belongs to, from its name and then its instrument,
 * or undefined when it is instrumental, names no section, or names several
 * (`Soprano/Alto`), since a single line cannot be picked from those.
 */
export const classifyVoiceSection = (
  part: Pick<ScorePart, 'name' | 'instrument' | 'kind'>,
): VoiceSection | undefined => {
  if (part.kind === 'instrumental') {
    return undefined;
  }

  for (const clue of [part.name, part.instrument]) {
    const found = sectionsInClue(normalize(clue));

    if (found.length === 1) {
      return found[0];
    }

    if (found.length > 1) {
      return undefined;
    }
  }

  return undefined;
};

/** The parts a singer of this section reads, in score order. */
export const partsForVoiceSection = (
  parts: readonly ScorePart[],
  section: VoiceSection,
): ScorePart[] => {
  return parts.filter((part) => classifyVoiceSection(part) === section);
};
