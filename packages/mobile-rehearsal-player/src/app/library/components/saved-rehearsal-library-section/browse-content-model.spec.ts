import assert from 'node:assert/strict';
import { describe, it } from 'node:test';

import { resolveSearchNoResultsMessage } from './browse-content-model';

describe('resolveSearchNoResultsMessage', () => {
  it('names what was searched for each view that has no matches', () => {
    assert.equal(
      resolveSearchNoResultsMessage({
        query: 'radio',
        resultCounts: { files: 5, loops: 5, playlists: 5, tracks: 0 },
        view: 'tracks',
      }),
      'No saved tracks match "radio".',
    );
    assert.equal(
      resolveSearchNoResultsMessage({
        query: 'radio',
        resultCounts: { files: 5, loops: 0, playlists: 5, tracks: 5 },
        view: 'loops',
      }),
      'No saved loops match "radio".',
    );
    assert.equal(
      resolveSearchNoResultsMessage({
        query: 'radio',
        resultCounts: { files: 5, loops: 5, playlists: 0, tracks: 5 },
        view: 'playlists',
      }),
      'No playlists match "radio".',
    );
  });

  it('says nothing while there are results or no search is active', () => {
    assert.equal(
      resolveSearchNoResultsMessage({
        query: 'radio',
        resultCounts: { files: 0, loops: 0, playlists: 0, tracks: 3 },
        view: 'tracks',
      }),
      null,
    );
    assert.equal(
      resolveSearchNoResultsMessage({
        query: null,
        resultCounts: { files: 5, loops: 5, playlists: 5, tracks: 0 },
        view: 'tracks',
      }),
      null,
    );
  });

  it('names files for the Files view', () => {
    assert.equal(
      resolveSearchNoResultsMessage({
        query: 'radio',
        resultCounts: { files: 0, loops: 5, playlists: 5, tracks: 5 },
        view: 'files',
      }),
      'No files match "radio".',
    );
  });

  it('leaves Tags to its own empty state', () => {
    for (const view of ['tags'] as const) {
      assert.equal(
        resolveSearchNoResultsMessage({
          query: 'radio',
          resultCounts: { files: 0, loops: 0, playlists: 0, tracks: 0 },
          view,
        }),
        null,
      );
    }
  });
});
