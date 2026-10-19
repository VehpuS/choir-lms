/** A rehearsal mark (`A`, `B`, `Chorus`) and the bar it sits on. */
export type ScoreRehearsalMark = {
  /** 1-based position of the bar in the score, counting every bar. */
  barIndex: number;
  text: string;
};

export type ScoreBars = {
  /** How many bars the score has (taken from its first part). */
  barCount: number;
  /**
   * The number printed on each bar, in order: a pickup is often `0` and a
   * score may skip or repeat numbers, so this is not `1..barCount`.
   */
  barLabels: string[];
  rehearsalMarks: ScoreRehearsalMark[];
};

const PART_BLOCK_PATTERN = /<part\b[^>]*>([\s\S]*?)<\/part>/g;
const MEASURE_PATTERN = /<measure\b([^>]*)>([\s\S]*?)<\/measure>/g;
const MEASURE_NUMBER_PATTERN = /\bnumber\s*=\s*(?:"([^"]*)"|'([^']*)')/;
const REHEARSAL_PATTERN = /<rehearsal\b[^>]*>([\s\S]*?)<\/rehearsal>/g;
const NAMED_ENTITIES: Record<string, string> = {
  amp: '&',
  apos: "'",
  gt: '>',
  lt: '<',
  quot: '"',
};
const ENTITY_PATTERN = /&(amp|apos|gt|lt|quot);/g;
const WHITESPACE_RUN_PATTERN = /\s+/g;

const decodeText = (text: string): string => {
  return text
    .replace(ENTITY_PATTERN, (_, name: string) => NAMED_ENTITIES[name] ?? '')
    .replace(WHITESPACE_RUN_PATTERN, ' ')
    .trim();
};

/**
 * Reads the bars of a partwise MusicXML score: how many there are, the number
 * printed on each, and its rehearsal marks. Marks are gathered from every part
 * (they usually sit in the first, but a conductor part may hold them). A
 * timewise score, or text with no parts, reads as no bars. Never throws.
 */
export const extractScoreBars = (musicXml: string): ScoreBars => {
  const barLabels: string[] = [];
  const marks = new Map<string, ScoreRehearsalMark>();
  let isFirstPart = true;

  for (const part of musicXml.matchAll(PART_BLOCK_PATTERN)) {
    let barIndex = 0;

    for (const measure of (part[1] ?? '').matchAll(MEASURE_PATTERN)) {
      barIndex += 1;

      if (isFirstPart) {
        const attributes = measure[1] ?? '';
        const match = MEASURE_NUMBER_PATTERN.exec(attributes);

        barLabels.push(match?.[1] ?? match?.[2] ?? String(barIndex));
      }

      for (const rehearsal of (measure[2] ?? '').matchAll(REHEARSAL_PATTERN)) {
        const text = decodeText(rehearsal[1] ?? '');

        if (text !== '') {
          marks.set(`${barIndex}:${text}`, { barIndex, text });
        }
      }
    }

    isFirstPart = false;
  }

  return {
    barCount: barLabels.length,
    barLabels,
    rehearsalMarks: [...marks.values()].sort((a, b) => a.barIndex - b.barIndex),
  };
};
