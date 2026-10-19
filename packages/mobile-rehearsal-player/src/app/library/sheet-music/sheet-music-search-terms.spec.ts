import assert from 'node:assert/strict';
import { describe, it } from 'node:test';

import { suggestSheetMusicQuery } from './sheet-music-search-terms';

describe('suggestSheetMusicQuery', () => {
  it('reads a track file name the way the lyrics editor does', () => {
    assert.deepEqual(suggestSheetMusicQuery('03 - Kyrie_Eleison.mp3'), {
      artist: '',
      title: 'Kyrie Eleison',
    });
  });

  it('fills the artist from an Artist - Title name', () => {
    assert.deepEqual(suggestSheetMusicQuery('Rutter - Gloria.mp3'), {
      artist: 'Rutter',
      title: 'Gloria',
    });
  });
});
