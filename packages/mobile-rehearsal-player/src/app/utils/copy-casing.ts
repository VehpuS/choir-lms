// The sentence-case rule for interface text (design Decision 15): the first
// word of a sentence is capitalized and every other word is lowercase unless it
// is a proper name. This module finds the words that break the rule; the
// source guard (`copy-casing-guard.spec.ts`) applies it to every user-facing
// string in the app.

/**
 * Proper names that keep their capitals in the middle of a sentence: Google's
 * own names, the product's `Add` and `Recents` destinations (lowercase `add`
 * would read as a verb), and the names of the tools the app tells people about.
 * `Library` is deliberately not here: it is a generic noun in running copy
 * (`Save to library`) and capitalized only as the first word.
 */
const PROPER_NAMES: ReadonlySet<string> = new Set([
  'Add',
  'Android',
  'Drive',
  'Expo',
  'Go',
  'Google',
  'I',
  'My',
  'OAuth',
  'Recents',
  'iOS',
]);

const TEMPLATE_EXPRESSION_PATTERN = /\$\{(?:[^{}]|\{[^{}]*\})*\}/g;
// A quoted segment is a label or a name the text refers to (`"Make loop"`,
// a file name, a playlist name) and keeps its own capitalization.
const QUOTED_SEGMENT_PATTERN = /"[^"]*"|“[^”]*”|`[^`]*`/g;
const SENTENCE_BOUNDARY_PATTERN = /(?<=[.!?:])\s+|\n/;
const WORD_EDGE_PATTERN = /^[^A-Za-z]+|[^A-Za-z]+$/g;
const FILE_NAME_PATTERN = /\.[a-z0-9]{2,4}\b/;
const CAPITALIZED_WORD_PATTERN = /^[A-Z][a-z]/;
// `TrackPlayer`, `LibrarySelectionServicesProvider`: a code or brand name.
const INTERNAL_CAPITAL_PATTERN = /[a-z][A-Z]/;
const PLACEHOLDER_WORDS: ReadonlySet<string> = new Set(['Q', 'X']);

/** The capitalized words that follow the first word of each sentence and are not proper names. */
export const findSentenceCaseViolations = (text: string): string[] => {
  const withoutDynamicParts = text
    .replace(TEMPLATE_EXPRESSION_PATTERN, 'X')
    .replace(QUOTED_SEGMENT_PATTERN, 'Q');

  return withoutDynamicParts
    .split(SENTENCE_BOUNDARY_PATTERN)
    .flatMap((sentence) =>
      sentence
        .split(/\s+/)
        .slice(1)
        .flatMap((token) => {
          const word = token.replace(WORD_EDGE_PATTERN, '');

          return word !== '' &&
            !PROPER_NAMES.has(word) &&
            !PLACEHOLDER_WORDS.has(word) &&
            !FILE_NAME_PATTERN.test(token) &&
            !INTERNAL_CAPITAL_PATTERN.test(word) &&
            CAPITALIZED_WORD_PATTERN.test(word)
            ? [word]
            : [];
        }),
    );
};
