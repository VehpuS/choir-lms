import assert from 'node:assert/strict';
import { describe, it } from 'node:test';

import { getLibraryScreenSummaryCopy } from './screen-copy.js';

describe('getLibraryScreenSummaryCopy', () => {
  it('guides an empty library toward current playback work instead of future slices', () => {
    assert.deepEqual(getLibraryScreenSummaryCopy({ savedTrackCount: 0 }), {
      body: 'Save a track from Add to start full-track playback, loops, and playlists in your rehearsal library.',
      title: 'Library is ready for your first track',
    });
  });

  it('points at the dedicated library destination once tracks are saved', () => {
    assert.deepEqual(getLibraryScreenSummaryCopy({ savedTrackCount: 1 }), {
      body: '1 saved rehearsal track is ready for playback, loop capture, and playlist work here. Tracks, loops, and playlists stay grouped inside the same personal library destination.',
      title: 'Your saved practice material lives here',
    });
  });
});