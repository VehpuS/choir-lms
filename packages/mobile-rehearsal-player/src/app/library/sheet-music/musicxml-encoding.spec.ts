import assert from 'node:assert/strict';
import { describe, it } from 'node:test';

import { decodeMusicXmlBytes } from './musicxml-encoding.js';

const HEADER =
  '<?xml version="1.0" encoding="UTF-16"?><score-partwise><!-- Ælfred – Kyrie --></score-partwise>';

const utf16 = (text: string, isLittleEndian: boolean, bom: boolean) => {
  const bytes: number[] = bom
    ? isLittleEndian
      ? [0xff, 0xfe]
      : [0xfe, 0xff]
    : [];

  for (const char of text) {
    const unit = char.charCodeAt(0);
    const low = unit & 0xff;
    const high = unit >> 8;

    bytes.push(...(isLittleEndian ? [low, high] : [high, low]));
  }

  return Uint8Array.from(bytes);
};

describe('decodeMusicXmlBytes', () => {
  it('decodes UTF-8 with and without a byte-order mark', () => {
    const plain = new TextEncoder().encode(HEADER);
    const withBom = Uint8Array.from([0xef, 0xbb, 0xbf, ...plain]);

    assert.equal(decodeMusicXmlBytes(plain), HEADER);
    assert.equal(decodeMusicXmlBytes(withBom), HEADER);
  });

  it('decodes UTF-16 little- and big-endian with a byte-order mark', () => {
    assert.equal(decodeMusicXmlBytes(utf16(HEADER, true, true)), HEADER);
    assert.equal(decodeMusicXmlBytes(utf16(HEADER, false, true)), HEADER);
  });

  it('decodes UTF-16 without a byte-order mark from its leading <?', () => {
    assert.equal(decodeMusicXmlBytes(utf16(HEADER, true, false)), HEADER);
    assert.equal(decodeMusicXmlBytes(utf16(HEADER, false, false)), HEADER);
  });

  it('refuses UTF-32 and decodes garbage without throwing', () => {
    assert.equal(
      decodeMusicXmlBytes(Uint8Array.from([0xff, 0xfe, 0x00, 0x00, 0x3c])),
      null,
    );
    assert.equal(
      typeof decodeMusicXmlBytes(Uint8Array.from([0x80, 0x81, 0xfe, 0x00])),
      'string',
    );
    assert.equal(decodeMusicXmlBytes(new Uint8Array()), '');
  });
});
