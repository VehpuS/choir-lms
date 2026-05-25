import assert from 'node:assert/strict';
import { describe, it } from 'node:test';

import {
  getHomeContinuePracticingCopy,
  getLibraryScreenSummaryCopy,
  getSearchScreenSummaryCopy,
} from '../screen-copy.js';

describe('getHomeContinuePracticingCopy', () => {
  it('promotes the active item when playback is already in progress', () => {
    assert.deepEqual(
      getHomeContinuePracticingCopy({
        activePlayableItemTitle: 'Kyrie Alto.mp3',
        savedTrackCount: 2,
      }),
      {
        body: 'Kyrie Alto.mp3 is still active in the mini-player, and 2 saved rehearsal tracks are ready in Library for loops and playlist work.',
        title: 'Continue practicing',
      },
    );
  });

  it('guides the user to save a first track when the library is empty', () => {
    assert.deepEqual(
      getHomeContinuePracticingCopy({
        activePlayableItemTitle: null,
        savedTrackCount: 0,
      }),
      {
        body: 'Browse My Drive or shared folders below, then save a track to start building loops and playlists in your personal rehearsal library.',
        title: 'Start your library',
      },
    );
  });
});

describe('getSearchScreenSummaryCopy', () => {
  it('shows a search prompt before a query runs', () => {
    assert.deepEqual(
      getSearchScreenSummaryCopy({
        activeSearchQuery: null,
        resultCount: 0,
      }),
      {
        body: 'Search across My Drive and shared folders, then save promising tracks into Library without leaving this result view.',
        title: 'Search the rehearsal catalog',
      },
    );
  });

  it('explains how to recover when a query returns no supported results', () => {
    assert.deepEqual(
      getSearchScreenSummaryCopy({
        activeSearchQuery: 'amen cadence',
        resultCount: 0,
      }),
      {
        body: 'No supported rehearsal audio matched "amen cadence" yet. Try a shorter choir, section, or piece name, or clear the search to start over.',
        title: 'No matching rehearsal tracks yet',
      },
    );
  });
});

describe('getLibraryScreenSummaryCopy', () => {
  it('points at the dedicated library destination once tracks are saved', () => {
    assert.deepEqual(getLibraryScreenSummaryCopy({ savedTrackCount: 1 }), {
      body: '1 saved rehearsal track is ready for full-track playback and loop capture here. Playlist editing lands next, but the personal library is now separated from discovery and search.',
      title: 'Your saved practice material lives here',
    });
  });
});
