import assert from 'node:assert/strict';
import { describe, it } from 'node:test';

import {
  buildLyricsWebSearchUrl,
  suggestLyricsQuery,
} from './lyrics-search-terms.js';

describe('suggestLyricsQuery', () => {
  it('drops the extension and a leading track number', () => {
    assert.deepEqual(suggestLyricsQuery('04_Mezmerize.mp3'), {
      artist: '',
      title: 'Mezmerize',
    });
    assert.deepEqual(suggestLyricsQuery('12 - Bohemian Rhapsody.m4a'), {
      artist: '',
      title: 'Bohemian Rhapsody',
    });
    assert.deepEqual(suggestLyricsQuery('07. Hallelujah.wav'), {
      artist: '',
      title: 'Hallelujah',
    });
  });

  it('strips a compound rehearsal number such as 1-05 completely', () => {
    assert.deepEqual(suggestLyricsQuery('1-05 Radio_Video.mp3'), {
      artist: '',
      title: 'Radio Video',
    });
    assert.deepEqual(suggestLyricsQuery('2.10 - Kyrie.mp3'), {
      artist: '',
      title: 'Kyrie',
    });
  });

  it('reads underscores as spaces and collapses whitespace', () => {
    assert.equal(
      suggestLyricsQuery('Ave_Maria__Soprano_Part.mp3').title,
      'Ave Maria Soprano Part',
    );
  });

  it('keeps titles that merely start with digits', () => {
    assert.equal(
      suggestLyricsQuery('99 Luftballons.mp3').title,
      '99 Luftballons',
    );
    assert.equal(suggestLyricsQuery('1999.mp3').title, '1999');
    assert.equal(
      suggestLyricsQuery('10cc - Dreadlock Holiday.mp3').artist,
      '10cc',
    );
  });

  it('splits Artist - Title at the first spaced dash', () => {
    assert.deepEqual(suggestLyricsQuery('Queen - Bohemian Rhapsody.mp3'), {
      artist: 'Queen',
      title: 'Bohemian Rhapsody',
    });
    assert.deepEqual(suggestLyricsQuery('Queen_-_Bohemian_Rhapsody.mp3'), {
      artist: 'Queen',
      title: 'Bohemian Rhapsody',
    });
    assert.deepEqual(suggestLyricsQuery('Leonard Cohen – Hallelujah.m4a'), {
      artist: 'Leonard Cohen',
      title: 'Hallelujah',
    });
  });

  it('strips a track number before looking for the artist', () => {
    assert.deepEqual(suggestLyricsQuery('03 - Queen - Bohemian Rhapsody.mp3'), {
      artist: 'Queen',
      title: 'Bohemian Rhapsody',
    });
  });

  it('keeps a title that itself contains a spaced dash', () => {
    assert.deepEqual(
      suggestLyricsQuery('Artist - Song - Live at the Hall.mp3'),
      { artist: 'Artist', title: 'Song - Live at the Hall' },
    );
  });

  it('does not split on a dash without spaces or with nothing beside it', () => {
    assert.deepEqual(suggestLyricsQuery('Radio-Video.mp3'), {
      artist: '',
      title: 'Radio-Video',
    });
    assert.deepEqual(suggestLyricsQuery('Kyrie -.mp3').artist, '');
  });

  it('returns names without an extension unchanged', () => {
    assert.deepEqual(suggestLyricsQuery('Kyrie'), {
      artist: '',
      title: 'Kyrie',
    });
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
