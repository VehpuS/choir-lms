const UTF8_BOM = [0xef, 0xbb, 0xbf] as const;
const UTF16_LE_BOM = [0xff, 0xfe] as const;
const UTF16_BE_BOM = [0xfe, 0xff] as const;
const UTF32_LE_BOM = [0xff, 0xfe, 0x00, 0x00] as const;
const UTF32_BE_BOM = [0x00, 0x00, 0xfe, 0xff] as const;
// `<?` in UTF-16 with no byte-order mark: every XML file starts with it.
const UTF16_LE_XML_START = [0x3c, 0x00, 0x3f, 0x00] as const;
const UTF16_BE_XML_START = [0x00, 0x3c, 0x00, 0x3f] as const;
const BYTES_PER_UTF16_UNIT = 2;
const UTF16_CHUNK_UNITS = 4096;

const startsWith = (bytes: Uint8Array, prefix: readonly number[]): boolean => {
  return prefix.every((byte, index) => bytes[index] === byte);
};

// Done by hand so decoding does not depend on `TextDecoder` supporting UTF-16.
const decodeUtf16 = (
  bytes: Uint8Array,
  start: number,
  isLittleEndian: boolean,
): string => {
  const units: number[] = [];

  for (
    let index = start;
    index + 1 < bytes.length;
    index += BYTES_PER_UTF16_UNIT
  ) {
    const first = bytes[index] ?? 0;
    const second = bytes[index + 1] ?? 0;

    units.push(isLittleEndian ? first | (second << 8) : (first << 8) | second);
  }

  let text = '';

  for (let index = 0; index < units.length; index += UTF16_CHUNK_UNITS) {
    text += String.fromCharCode(
      ...units.slice(index, index + UTF16_CHUNK_UNITS),
    );
  }

  return text;
};

/**
 * Decodes MusicXML bytes to text: UTF-8 with or without a BOM, and UTF-16 in
 * either byte order with a BOM or recognised by its leading `<?`. Returns null
 * for UTF-32, which no MusicXML tool writes and the viewer cannot read.
 */
export const decodeMusicXmlBytes = (bytes: Uint8Array): string | null => {
  if (startsWith(bytes, UTF32_LE_BOM) || startsWith(bytes, UTF32_BE_BOM)) {
    return null;
  }

  if (startsWith(bytes, UTF16_LE_BOM)) {
    return decodeUtf16(bytes, UTF16_LE_BOM.length, true);
  }

  if (startsWith(bytes, UTF16_BE_BOM)) {
    return decodeUtf16(bytes, UTF16_BE_BOM.length, false);
  }

  if (startsWith(bytes, UTF16_LE_XML_START)) {
    return decodeUtf16(bytes, 0, true);
  }

  if (startsWith(bytes, UTF16_BE_XML_START)) {
    return decodeUtf16(bytes, 0, false);
  }

  const start = startsWith(bytes, UTF8_BOM) ? UTF8_BOM.length : 0;

  return new TextDecoder('utf-8').decode(bytes.subarray(start));
};
