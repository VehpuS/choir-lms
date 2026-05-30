import assert from 'node:assert/strict';
import { describe, it } from 'node:test';

import {
  getHomeContinuePracticingCopy,
  getLibraryScreenSummaryCopy,
  getRecentsShortcutPlayActionCopy,
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
        body: 'Resume Kyrie Alto.mp3 or jump to Library for another saved rehearsal item.',
        title: 'Resume recent rehearsal',
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
        body: 'No recent rehearsal yet. Start in Search or Library.',
        title: 'No recent rehearsal yet',
      },
    );
  });

  it('points users with saved tracks toward Library when no active item exists', () => {
    assert.deepEqual(
      getHomeContinuePracticingCopy({
        activePlayableItemTitle: null,
        savedTrackCount: 3,
      }),
      {
        body: '3 saved rehearsal tracks are ready in Library. Open Library to continue practicing.',
        title: 'Recent rehearsal entry points',
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

describe('getRecentsShortcutPlayActionCopy', () => {
  it('builds shortcut-specific play icon labels', () => {
    assert.deepEqual(
      getRecentsShortcutPlayActionCopy({
        isResumePlaybackAvailable: true,
        shortcutTag: 'Alto',
      }),
      {
        accessibilityLabel: 'Play Alto shortcut',
        disabled: false,
      },
    );
  });

  it('keeps shortcut icon actions disabled when playback is not available', () => {
    assert.deepEqual(
      getRecentsShortcutPlayActionCopy({
        isResumePlaybackAvailable: false,
        shortcutTag: 'Bass',
      }),
      {
        accessibilityLabel: 'Play Bass shortcut',
        disabled: true,
      },
    );
  });
});

describe('getLibraryScreenSummaryCopy', () => {
  it('guides an empty library toward current playback work instead of future slices', () => {
    assert.deepEqual(getLibraryScreenSummaryCopy({ savedTrackCount: 0 }), {
      body: 'Save a track from Home or Search to start full-track playback, loops, and playlists in your rehearsal library.',
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
