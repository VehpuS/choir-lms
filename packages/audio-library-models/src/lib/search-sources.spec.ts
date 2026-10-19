import assert from 'node:assert/strict';
import { describe, it } from 'node:test';

import {
  BUILT_IN_SEARCH_SOURCES,
  MAX_SEARCH_SOURCES,
  addSearchSource,
  buildSearchUrl,
  createCustomSearchSource,
  findSearchTemplateProblem,
  removeSearchSource,
  sanitizeSearchSources,
  unusedBuiltInSearchSources,
  type SearchSource,
} from './search-sources.ts';

const source = (id: string, host = 'example.com'): SearchSource => ({
  id,
  label: id,
  urlTemplate: `https://${host}/?q={query}`,
});

describe('built-in search sources', () => {
  it('all pass the template rules they impose on custom sources', () => {
    for (const kind of ['lyrics', 'sheet-music'] as const) {
      for (const { urlTemplate } of BUILT_IN_SEARCH_SOURCES[kind]) {
        assert.equal(findSearchTemplateProblem(urlTemplate), undefined);
      }
    }
  });

  it('lists the sources the user agreed on, MuseScore first for sheet music', () => {
    assert.deepEqual(
      BUILT_IN_SEARCH_SOURCES['sheet-music'].map(({ label }) => label),
      ['MuseScore', 'IMSLP', 'Web (PDF)'],
    );
    assert.deepEqual(
      BUILT_IN_SEARCH_SOURCES.lyrics.map(({ label }) => label),
      ['Google', 'DuckDuckGo', 'Genius'],
    );
  });
});

describe('findSearchTemplateProblem', () => {
  it('accepts an https address with a placeholder', () => {
    assert.equal(
      findSearchTemplateProblem('https://choir.example/find?q={query}'),
      undefined,
    );
    assert.equal(
      findSearchTemplateProblem('https://a.example/{title}/{artist}'),
      undefined,
    );
  });

  it('refuses anything but https', () => {
    assert.equal(
      findSearchTemplateProblem('http://choir.example/?q={query}'),
      'not-https',
    );
    assert.equal(
      findSearchTemplateProblem('javascript:alert({query})'),
      'not-https',
    );
  });

  it('refuses an address with no placeholder', () => {
    assert.equal(
      findSearchTemplateProblem('https://choir.example/search'),
      'no-placeholder',
    );
  });

  it('refuses spaces, a missing host, and an overlong template', () => {
    assert.equal(
      findSearchTemplateProblem('https://choir.example/a b?q={query}'),
      'invalid-address',
    );
    assert.equal(
      findSearchTemplateProblem('https://?q={query}'),
      'invalid-address',
    );
    assert.equal(
      findSearchTemplateProblem(
        `https://a.example/?q={query}${'x'.repeat(300)}`,
      ),
      'too-long',
    );
  });
});

describe('buildSearchUrl', () => {
  it('fills {query} with the encoded title and artist together', () => {
    assert.equal(
      buildSearchUrl(
        { urlTemplate: 'https://musescore.com/sheetmusic?text={query}' },
        { artist: 'Queen', title: 'Bohemian  Rhapsody ' },
      ),
      'https://musescore.com/sheetmusic?text=Bohemian%20Rhapsody%20Queen',
    );
  });

  it('fills {title} and {artist} separately, leaving no stray space when one is empty', () => {
    assert.equal(
      buildSearchUrl(
        { urlTemplate: 'https://a.example/{artist}/{title}' },
        { artist: '', title: 'Ave Maria' },
      ),
      'https://a.example//Ave%20Maria',
    );
    assert.equal(
      buildSearchUrl(
        { urlTemplate: 'https://a.example/?q={query}' },
        {
          artist: '',
          title: 'Ave Maria',
        },
      ),
      'https://a.example/?q=Ave%20Maria',
    );
  });

  it('encodes characters that would break the address', () => {
    assert.equal(
      buildSearchUrl(
        { urlTemplate: 'https://a.example/?q={query}' },
        {
          artist: 'A&B',
          title: 'x=y#z',
        },
      ),
      'https://a.example/?q=x%3Dy%23z%20A%26B',
    );
  });

  it("keeps today's lyrics search for the first lyrics source", () => {
    const [google] = BUILT_IN_SEARCH_SOURCES.lyrics;

    assert.equal(
      buildSearchUrl(google, { artist: 'Queen', title: 'Bohemian Rhapsody' }),
      'https://www.google.com/search?q=Bohemian%20Rhapsody%20Queen%20lyrics',
    );
  });

  it("keeps today's MuseScore search for the first sheet music source", () => {
    const [muse] = BUILT_IN_SEARCH_SOURCES['sheet-music'];

    assert.equal(
      buildSearchUrl(muse, { artist: 'Queen', title: 'Bohemian Rhapsody' }),
      'https://musescore.com/sheetmusic?text=Bohemian%20Rhapsody%20Queen',
    );
  });
});

describe('sanitizeSearchSources', () => {
  it('drops malformed, unsafe, and repeated entries', () => {
    const result = sanitizeSearchSources(
      [
        source('a'),
        source('a', 'other.example'),
        source('b'),
        {
          id: 'c',
          label: 'No https',
          urlTemplate: 'http://x.example/?q={query}',
        },
        { id: 'd', label: '', urlTemplate: 'https://x.example/?q={query}' },
        'nope',
        null,
        source('e', 'e.example'),
      ],
      'lyrics',
    );

    assert.deepEqual(
      result.map(({ id }) => id),
      ['a', 'e'],
    );
  });

  it('falls back to the built-ins for anything that leaves nothing', () => {
    assert.deepEqual(
      sanitizeSearchSources('x', 'sheet-music'),
      BUILT_IN_SEARCH_SOURCES['sheet-music'],
    );
    assert.deepEqual(
      sanitizeSearchSources([], 'lyrics'),
      BUILT_IN_SEARCH_SOURCES.lyrics,
    );
  });

  it('caps the list', () => {
    const many = Array.from({ length: 20 }, (_, index) =>
      source(`s${index}`, `h${index}.example`),
    );

    assert.equal(
      sanitizeSearchSources(many, 'lyrics').length,
      MAX_SEARCH_SOURCES,
    );
  });
});

describe('search source list helpers', () => {
  it('offers the built-ins that are not on the list', () => {
    const [muse, ...rest] = BUILT_IN_SEARCH_SOURCES['sheet-music'];

    assert.deepEqual(unusedBuiltInSearchSources('sheet-music', [muse]), rest);
    assert.deepEqual(
      unusedBuiltInSearchSources('sheet-music', [...rest, muse]),
      [],
    );
  });

  it('adds a source last and ignores a repeat or a full list', () => {
    assert.deepEqual(
      addSearchSource([source('a')], source('b', 'b.example')).map(
        ({ id }) => id,
      ),
      ['a', 'b'],
    );
    assert.equal(addSearchSource([source('a')], source('a2')).length, 1);
    const full = Array.from({ length: MAX_SEARCH_SOURCES }, (_, index) =>
      source(`s${index}`, `h${index}.example`),
    );

    assert.equal(
      addSearchSource(full, source('z', 'z.example')).length,
      MAX_SEARCH_SOURCES,
    );
  });

  it('never removes the last source', () => {
    assert.deepEqual(
      removeSearchSource([source('a'), source('b', 'b.example')], 'a').map(
        ({ id }) => id,
      ),
      ['b'],
    );
    assert.deepEqual(
      removeSearchSource([source('a')], 'a').map(({ id }) => id),
      ['a'],
    );
  });

  it('creates a custom source with a unique id, or nothing for a bad template', () => {
    const list = [{ ...source('custom-choir') }];
    const created = createCustomSearchSource(
      list,
      ' Choir  site ',
      'https://choir.example/?q={query}',
    );

    assert.deepEqual(created, {
      id: 'custom-choir-site',
      label: 'Choir site',
      urlTemplate: 'https://choir.example/?q={query}',
    });
    assert.equal(
      createCustomSearchSource(
        list,
        'Choir',
        'https://choir.example/?q={query}',
      )?.id,
      'custom-choir-2',
    );
    assert.equal(
      createCustomSearchSource(list, 'X', 'http://x.example/{query}'),
      undefined,
    );
    assert.equal(
      createCustomSearchSource(list, '  ', 'https://x.example/{query}'),
      undefined,
    );
  });
});
