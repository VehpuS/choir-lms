import assert from 'node:assert/strict';
import { describe, it } from 'node:test';

import { isolateBidi } from './bidi-isolate';

// FIRST STRONG ISOLATE and POP DIRECTIONAL ISOLATE, by code point so the source
// holds no invisible characters.
const START = String.fromCodePoint(0x2068);
const END = String.fromCodePoint(0x2069);
const HEBREW_NAME = 'אור-פנד-לנד-2026-12-09';
const ARABIC_NAME = 'ترنيمة';

describe('isolateBidi', () => {
  it('leaves plain names untouched', () => {
    assert.equal(isolateBidi('Sunday Set'), 'Sunday Set');
    assert.equal(isolateBidi('2026-12-09'), '2026-12-09');
    assert.equal(isolateBidi(''), '');
  });

  it('wraps a Hebrew name in a first-strong isolate', () => {
    assert.equal(isolateBidi(HEBREW_NAME), `${START}${HEBREW_NAME}${END}`);
  });

  it('wraps an Arabic name', () => {
    assert.equal(isolateBidi(ARABIC_NAME), `${START}${ARABIC_NAME}${END}`);
  });

  it('wraps a name that mixes scripts', () => {
    assert.equal(isolateBidi('Kyrie שלום'), `${START}Kyrie שלום${END}`);
  });
});
