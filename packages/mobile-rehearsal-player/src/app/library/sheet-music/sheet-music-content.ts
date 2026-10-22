export type SheetMusicContentFormat = 'pdf' | 'musicxml' | 'midi';

import { decodeMusicXmlBytes } from './musicxml-encoding';

/** Why bytes were refused; only used to choose the failure copy. */
export type SheetMusicContentProblem =
  /** A sign-in or error page where the file should be. */
  | 'html-page'
  /** Text that is not a MusicXML score. */
  | 'not-musicxml'
  /** A PDF or MIDI source whose bytes are something else. */
  | 'wrong-format'
  /** Text in an encoding the viewer cannot read (UTF-32). */
  | 'unreadable-encoding';

export type SheetMusicContentCheck =
  | {
      isValid: true;
      /** A `.mxl` zip the renderer must unzip. */ isCompressed: boolean;
    }
  | { isValid: false; reason: SheetMusicContentProblem };

const PDF_SIGNATURE = '%PDF-';
const MIDI_SIGNATURE = 'MThd';
const ZIP_SIGNATURE = 'PK\u0003\u0004';
const PDF_SIGNATURE_WINDOW_BYTES = 1024;
const MUSICXML_ROOT_WINDOW_BYTES = 16_384;
const HTML_PAGE_PATTERN = /^\s*(?:<!doctype\s+html|<html\b)/i;
const XML_COMMENT_PATTERN = /<!--[\s\S]*?-->/g;
const MUSICXML_ROOT_PATTERN = /<score-(?:partwise|timewise)\b/;

// Bytes are read as Latin-1: enough for signatures and for finding an ASCII
// root tag in a UTF-8 file, without relying on a `TextDecoder` being present.
const readAscii = (bytes: Uint8Array, length: number): string => {
  let text = '';
  const end = Math.min(bytes.length, length);

  for (let index = 0; index < end; index += 1) {
    text += String.fromCharCode(bytes[index] ?? 0);
  }

  return text;
};

/** True when the text opens with a `score-partwise` or `score-timewise` root. */
export const hasMusicXmlRoot = (text: string): boolean => {
  return MUSICXML_ROOT_PATTERN.test(
    text.slice(0, MUSICXML_ROOT_WINDOW_BYTES).replace(XML_COMMENT_PATTERN, ''),
  );
};

const invalid = (reason: SheetMusicContentProblem): SheetMusicContentCheck => ({
  isValid: false,
  reason,
});

const valid = (isCompressed: boolean): SheetMusicContentCheck => ({
  isCompressed,
  isValid: true,
});

const wrongBinaryFormat = (bytes: Uint8Array): SheetMusicContentCheck => {
  return HTML_PAGE_PATTERN.test(readAscii(bytes, PDF_SIGNATURE_WINDOW_BYTES))
    ? invalid('html-page')
    : invalid('wrong-format');
};

/**
 * Confirms that downloaded bytes are what the source claims. A host that
 * answers 200 with an HTML sign-in page, or a `.xml` that is not MusicXML,
 * is refused here instead of reaching a renderer.
 */
export const inspectSheetMusicBytes = (
  format: SheetMusicContentFormat,
  bytes: Uint8Array,
): SheetMusicContentCheck => {
  if (format === 'pdf') {
    return readAscii(bytes, PDF_SIGNATURE_WINDOW_BYTES).includes(PDF_SIGNATURE)
      ? valid(false)
      : wrongBinaryFormat(bytes);
  }

  if (format === 'midi') {
    return readAscii(bytes, MIDI_SIGNATURE.length) === MIDI_SIGNATURE
      ? valid(false)
      : wrongBinaryFormat(bytes);
  }

  if (readAscii(bytes, ZIP_SIGNATURE.length) === ZIP_SIGNATURE) {
    return valid(true);
  }

  // Two bytes per character in UTF-16, so the window grows to cover the same text.
  const text = decodeMusicXmlBytes(
    bytes.subarray(0, MUSICXML_ROOT_WINDOW_BYTES * 2),
  );

  if (text === null) {
    return invalid('unreadable-encoding');
  }

  if (hasMusicXmlRoot(text)) {
    return valid(false);
  }

  return invalid(HTML_PAGE_PATTERN.test(text) ? 'html-page' : 'not-musicxml');
};
