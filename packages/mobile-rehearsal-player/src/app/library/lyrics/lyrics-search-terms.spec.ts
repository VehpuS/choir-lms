import assert from 'node:assert/strict';
import { describe, it } from 'node:test';

import {
  buildLyricsWebSearchUrl,
  suggestLyricsTitle,
} from './lyrics-search-terms.js';

describe('suggestLyricsTitle', () => {
  it('drops the extension and a leading track number', () => {
    assert.equal(suggestLyricsTitle('04_Mezmerize.mp3'), 'Mezmerize');
    assert.equal(
      suggestLyricsTitle('12 - Bohemian Rhapsody.m4a'),
      'Bohemian Rhapsody',
    );
    assert.equal(suggestLyricsTitle('07. Hallelujah.wav'), 'Hallelujah');
  });

  it('reads underscores as spaces and collapses whitespace', () => {
    assert.equal(
      suggestLyricsTitle('Ave_Maria__Soprano_Part.mp3'),
      'Ave Maria Soprano Part',
    );
  });

  it('keeps titles that merely start with digits', () => {
    assert.equal(suggestLyricsTitle('99 Luftballons.mp3'), '99 Luftballons');
    assert.equal(suggestLyricsTitle('1999.mp3'), '1999');
  });

  it('returns names without an extension unchanged', () => {
    assert.equal(suggestLyricsTitle('Kyrie'), 'Kyrie');
  });
});

describe('buildLyricsWebSearchUrl', () => {
  it('encodes title and artist and ends with lyrics', () => {
    assert.equal(
      buildLyricsWebSearchUrl({
        title: 'Mezmerize',
        artist: 'System of a Down',
      }),
      'https://www.google.com/search?q=Mezmerize%20System%20of%20a%20Down%20lyrics',
    );
  });

  it('omits an empty artist and encodes reserved characters', () => {
    assert.equal(
      buildLyricsWebSearchUrl({ title: 'Rock & Roll?', artist: ' ' }),
      'https://www.google.com/search?q=Rock%20%26%20Roll%3F%20lyrics',
    );
  });
});
