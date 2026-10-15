import assert from 'node:assert/strict';
import { describe, it } from 'node:test';

import {
  buildMuseScoreSearchUrl,
  suggestSheetMusicTitle,
} from './sheet-music-search-terms';

describe('buildMuseScoreSearchUrl', () => {
  it('searches the title and artist together', () => {
    assert.equal(
      buildMuseScoreSearchUrl({ artist: 'Mozart', title: 'Kyrie' }),
      'https://musescore.com/sheetmusic?text=Kyrie%20Mozart',
    );
  });

  it('leaves out an empty artist and collapses extra spaces', () => {
    assert.equal(
      buildMuseScoreSearchUrl({ artist: '  ', title: ' Ave   Maria ' }),
      'https://musescore.com/sheetmusic?text=Ave%20Maria',
    );
  });

  it('encodes characters that would end the query early', () => {
    assert.equal(
      buildMuseScoreSearchUrl({ artist: 'R&B #1', title: 'A+B' }),
      'https://musescore.com/sheetmusic?text=A%2BB%20R%26B%20%231',
    );
  });
});

describe('suggestSheetMusicTitle', () => {
  it('reads a track file name the way the lyrics editor does', () => {
    assert.equal(
      suggestSheetMusicTitle('03 - Kyrie_Eleison.mp3'),
      'Kyrie Eleison',
    );
  });
});
