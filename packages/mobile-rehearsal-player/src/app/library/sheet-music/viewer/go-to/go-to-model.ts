import type { ScorePart, ScoreRehearsalMark } from '@org/audio-library-models';

export const GO_TO_TITLE = 'Go to';
export const GO_TO_BAR_LABEL = 'Bar';
export const GO_TO_MARKS_TITLE = 'Rehearsal marks';
export const GO_TO_PARTS_TITLE = 'Parts, top to bottom';
export const GO_TO_EMPTY_MESSAGE = 'Enter a bar number.';

export type GoToBarResult =
  | { barIndex: number; status: 'ok' }
  | { message: string; status: 'empty' | 'not-found' };

/**
 * Finds the bar a singer typed. The number is the one printed on the score, so
 * a pickup numbered `0` or a score that skips numbers works as it reads; the
 * first bar with that number wins when a number repeats.
 */
export const resolveBarInput = (
  input: string,
  barLabels: readonly string[],
): GoToBarResult => {
  const typed = input.trim();

  if (typed === '') {
    return { message: GO_TO_EMPTY_MESSAGE, status: 'empty' };
  }

  const position = barLabels.findIndex((label) => {
    return label.toLowerCase() === typed.toLowerCase();
  });

  return position === -1
    ? {
        message: `There is no bar ${typed} in this score.`,
        status: 'not-found',
      }
    : { barIndex: position + 1, status: 'ok' };
};

export type GoToMarkRow = {
  barIndex: number;
  /** Where the mark sits, in the bar number printed on the score. */
  detail: string;
  key: string;
  label: string;
};

export const buildGoToMarkRows = (
  marks: readonly ScoreRehearsalMark[],
  barLabels: readonly string[],
): GoToMarkRow[] => {
  return marks.map((mark) => ({
    barIndex: mark.barIndex,
    detail: `Bar ${barLabels[mark.barIndex - 1] ?? mark.barIndex}`,
    key: `${mark.barIndex}:${mark.text}`,
    label: mark.text,
  }));
};

export type GoToPartRow = { key: string; name: string; position: number };

/** The shown parts in the order their staves are drawn, with their place from the top. */
export const buildGoToPartRows = (
  visibleParts: readonly ScorePart[],
): GoToPartRow[] => {
  return visibleParts.map((part, index) => ({
    key: `${part.index}:${part.name}`,
    name: part.name,
    position: index + 1,
  }));
};
