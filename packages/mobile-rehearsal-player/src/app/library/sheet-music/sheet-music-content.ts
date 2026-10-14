export type SheetMusicContentFormat = 'pdf' | 'musicxml' | 'midi';

export type SheetMusicContentCheck =
  | {
      isValid: true;
      /** A `.mxl` zip the renderer must unzip. */ isCompressed: boolean;
    }
  | { isValid: false };

const PDF_SIGNATURE = '%PDF-';
const MIDI_SIGNATURE = 'MThd';
const ZIP_SIGNATURE = 'PK\u0003\u0004';
const PDF_SIGNATURE_WINDOW_BYTES = 1024;
const MUSICXML_ROOT_WINDOW_BYTES = 16_384;
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
      ? { isValid: true, isCompressed: false }
      : { isValid: false };
  }

  if (format === 'midi') {
    return readAscii(bytes, MIDI_SIGNATURE.length) === MIDI_SIGNATURE
      ? { isValid: true, isCompressed: false }
      : { isValid: false };
  }

  if (readAscii(bytes, ZIP_SIGNATURE.length) === ZIP_SIGNATURE) {
    return { isValid: true, isCompressed: true };
  }

  const head = readAscii(bytes, MUSICXML_ROOT_WINDOW_BYTES).replace(
    XML_COMMENT_PATTERN,
    '',
  );

  return MUSICXML_ROOT_PATTERN.test(head)
    ? { isValid: true, isCompressed: false }
    : { isValid: false };
};
