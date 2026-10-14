export type ScorePartKind = 'vocal' | 'instrumental' | 'unknown';

export type ScorePart = {
  /** The `score-part` id, stable for the life of the file. */
  id: string;
  /** Position in the part list, so a saved choice can fall back to it. */
  index: number;
  /** Display name: part name, else abbreviation, else `Part N`. */
  name: string;
  instrument?: string;
  midiProgram?: number;
  /** MIDI channel, 1-based; set for MIDI files only. */
  channel?: number;
  kind: ScorePartKind;
};

export type ScorePartClues = {
  name?: string;
  abbreviation?: string;
  instrument?: string;
  /** MusicXML `midi-program`, 1-based. */
  midiProgram?: number;
};

// General MIDI 53 to 55 (1-based): Choir Aahs, Voice Oohs, Synth Voice.
const VOCAL_MIDI_PROGRAMS_ONE_BASED = new Set([53, 54, 55]);

const VOCAL_WORD_PATTERN =
  /\b(soprano|soprani|sop|sopr|mezzo|alto|alti|alt|contralto|countertenor|tenor|tenori|ten|baritone|bari|bar|bass|basso|bassi|treble|vocals?|voices?|vox|choir|chorus|choral|satb|ssaa|ttbb)\b/;
// A bare voice letter or combination, as in `S`, `A.`, `T 2`, `SATB`, `S/A`.
const VOICE_LETTERS_PATTERN = /^[satb](?:[\s./&,+-]*[satb])*[\s.]*\d*$/;
const INSTRUMENT_WORD_PATTERN =
  /\b(piano|organ|harpsichord|keyboards?|synth(?:esizer)?|accordion|guitar|ukulele|banjo|mandolin|harp|violin|viola|cello|violoncello|contrabass|double bass|string bass|strings?|flute|piccolo|oboe|clarinet|bassoon|saxophone|sax|horn|trumpet|cornet|trombone|euphonium|tuba|recorder|percussion|drums?|timpani|marimba|vibraphone|glockenspiel|xylophone|bells|accompaniment|orchestra|reduction|continuo)\b/;
const NON_VOCAL_BASS_PATTERN = /\bbass (clarinet|guitar|drum|trombone|flute)\b/;
const NON_LETTER_RUN_PATTERN = /[^\p{L}\p{N}\s./&,+-]+/gu;

const normalizeClue = (clue: string | undefined): string => {
  return (clue ?? '').toLowerCase().replace(NON_LETTER_RUN_PATTERN, ' ').trim();
};

const isInstrumentalClue = (clue: string): boolean => {
  return (
    INSTRUMENT_WORD_PATTERN.test(clue) || NON_VOCAL_BASS_PATTERN.test(clue)
  );
};

const isVocalClue = (clue: string): boolean => {
  return VOCAL_WORD_PATTERN.test(clue) || VOICE_LETTERS_PATTERN.test(clue);
};

/**
 * Decides whether a part is sung from its names and sound. An instrument word
 * wins over a voice word, so `Piano (SATB reduction)` and `Alto Sax` stay
 * instrumental. A non-vocal MIDI program alone is not evidence: exporters
 * write a default piano program on every part, so a part with no telling name
 * stays `unknown` rather than being hidden by the vocal filter.
 */
export const classifyVocalPart = (clues: ScorePartClues): ScorePartKind => {
  const texts = [clues.name, clues.abbreviation, clues.instrument]
    .map(normalizeClue)
    .filter((clue) => clue.length > 0);

  if (texts.some(isInstrumentalClue)) {
    return 'instrumental';
  }

  if (texts.some(isVocalClue)) {
    return 'vocal';
  }

  return clues.midiProgram !== undefined &&
    VOCAL_MIDI_PROGRAMS_ONE_BASED.has(clues.midiProgram)
    ? 'vocal'
    : 'unknown';
};

const COMMENT_PATTERN = /<!--[\s\S]*?-->/g;
const CDATA_PATTERN = /<!\[CDATA\[([\s\S]*?)\]\]>/g;
const PART_LIST_PATTERN = /<part-list\b[^>]*>([\s\S]*?)<\/part-list>/;
const SCORE_PART_PATTERN = /<score-part\b([^>]*)>([\s\S]*?)<\/score-part\s*>/g;
const ID_ATTRIBUTE_PATTERN = /\bid\s*=\s*(?:"([^"]*)"|'([^']*)')/;
const NUMERIC_ENTITY_PATTERN = /&#(x?[0-9a-f]+);/gi;
const NAMED_ENTITY_PATTERN = /&(amp|lt|gt|quot|apos);/g;
const MARKUP_PATTERN = /<[^>]*>/g;
const WHITESPACE_RUN_PATTERN = /\s+/g;
const XML_SPECIAL_CHARACTER_PATTERN = /[&<>]/g;

const NAMED_ENTITIES: Record<string, string> = {
  amp: '&',
  lt: '<',
  gt: '>',
  quot: '"',
  apos: "'",
};

const decodeEntities = (text: string): string => {
  return text
    .replace(NUMERIC_ENTITY_PATTERN, (_, code: string) => {
      const point =
        code[0] === 'x' || code[0] === 'X'
          ? Number.parseInt(code.slice(1), 16)
          : Number.parseInt(code, 10);

      return Number.isFinite(point) && point <= 0x10ffff
        ? String.fromCodePoint(point)
        : '';
    })
    .replace(NAMED_ENTITY_PATTERN, (_, name: string) => NAMED_ENTITIES[name]);
};

const buildElementPattern = (tag: string): RegExp => {
  return new RegExp(`<${tag}\\b[^>]*>([\\s\\S]*?)</${tag}\\s*>`);
};

const PART_NAME_PATTERN = buildElementPattern('part-name');
const PART_ABBREVIATION_PATTERN = buildElementPattern('part-abbreviation');
const INSTRUMENT_NAME_PATTERN = buildElementPattern('instrument-name');
const MIDI_PROGRAM_PATTERN = buildElementPattern('midi-program');

const readElementText = (xml: string, pattern: RegExp): string | undefined => {
  const match = pattern.exec(xml);

  if (!match) {
    return undefined;
  }

  const text = decodeEntities(
    (match[1] ?? '')
      .replace(MARKUP_PATTERN, ' ')
      .replace(WHITESPACE_RUN_PATTERN, ' ')
      .trim(),
  );

  return text.length === 0 ? undefined : text;
};

/**
 * Lists the parts a MusicXML score declares (`score-partwise` or
 * `score-timewise`), reading only the part list. Takes the XML text: a
 * compressed `.mxl` must be unzipped by the caller. Returns an empty list for
 * anything without a part list. A staff that holds several voices is one
 * declared part, and the vocal filter cannot split it further.
 */
export const extractScoreParts = (musicXml: string): ScorePart[] => {
  const cleaned = musicXml
    .replace(COMMENT_PATTERN, '')
    .replace(CDATA_PATTERN, (_, text: string) =>
      text.replace(XML_SPECIAL_CHARACTER_PATTERN, ' '),
    );
  const partList = PART_LIST_PATTERN.exec(cleaned)?.[1];

  if (partList === undefined) {
    return [];
  }

  const parts: ScorePart[] = [];

  for (const match of partList.matchAll(SCORE_PART_PATTERN)) {
    const idMatch = ID_ATTRIBUTE_PATTERN.exec(match[1] ?? '');
    const id = idMatch?.[1] ?? idMatch?.[2];

    if (!id) {
      continue;
    }

    const body = match[2] ?? '';
    const abbreviation = readElementText(body, PART_ABBREVIATION_PATTERN);
    const instrument = readElementText(body, INSTRUMENT_NAME_PATTERN);
    const programText = readElementText(body, MIDI_PROGRAM_PATTERN);
    const midiProgram =
      programText === undefined ? undefined : Number.parseInt(programText, 10);
    const declaredName = readElementText(body, PART_NAME_PATTERN);
    const index = parts.length;
    const name = declaredName ?? abbreviation ?? `Part ${index + 1}`;
    const program = Number.isFinite(midiProgram) ? midiProgram : undefined;

    parts.push({
      id,
      index,
      name,
      ...(instrument ? { instrument } : {}),
      ...(program === undefined ? {} : { midiProgram: program }),
      kind: classifyVocalPart({
        name: declaredName,
        abbreviation,
        instrument,
        midiProgram: program,
      }),
    });
  }

  return parts;
};
