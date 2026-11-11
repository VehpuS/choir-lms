// A name typed by the user can be right-to-left (Hebrew, Arabic), and the app
// builds lines like `Playing · <name> · 13 of 20` around it. Joined as plain
// text, a Hebrew name drags the whole line into a right-to-left paragraph (it
// right-aligns and reads backwards) or reorders its digits and dashes. Wrapping
// the name in a first-strong isolate keeps its own direction inside it and
// leaves the line's direction to the English around it.
// U+2068 FIRST STRONG ISOLATE and U+2069 POP DIRECTIONAL ISOLATE, built from
// their code points so the source holds no invisible characters.
const FIRST_STRONG_ISOLATE = String.fromCodePoint(0x2068);
const POP_DIRECTIONAL_ISOLATE = String.fromCodePoint(0x2069);

// Hebrew, Arabic, Syriac, Thaana and N'Ko blocks, the Hebrew and Arabic
// presentation forms, and the right-to-left scripts of the supplementary
// planes. Written as escapes in a string: a literal range here would put
// invisible characters in the source.
const RIGHT_TO_LEFT_PATTERN = new RegExp(
  '[\\u0590-\\u08FF\\uFB1D-\\uFDFF\\uFE70-\\uFEFC\\u{10800}-\\u{10FFF}\\u{1E800}-\\u{1EFFF}]',
  'u',
);

/**
 * For a `Text` showing a line the app wrote around a name (`Playing · <name> ·
 * 1 of 2`): the line is English, so it reads left to right and starts at the
 * left even when the name inside it is Hebrew. React Native Web gives every
 * `Text` `dir="auto"`, which takes the direction of the first strong
 * character, and that is the name's even inside an isolate, so the direction
 * has to be set explicitly.
 */
export const LEFT_TO_RIGHT_LINE_STYLE = {
  textAlign: 'left',
  writingDirection: 'ltr',
} as const;

/**
 * Isolates `text` for use inside a longer string when it contains
 * right-to-left characters; any other text is returned as it is, so lines
 * with plain names stay free of invisible characters.
 */
export const isolateBidi = (text: string): string => {
  return RIGHT_TO_LEFT_PATTERN.test(text)
    ? `${FIRST_STRONG_ISOLATE}${text}${POP_DIRECTIONAL_ISOLATE}`
    : text;
};
