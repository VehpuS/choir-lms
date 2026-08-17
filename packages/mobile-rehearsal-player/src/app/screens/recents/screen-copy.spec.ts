import assert from 'node:assert/strict';
import { describe, it } from 'node:test';

import {
  getRecentsContinuePracticingCopy,
  getRecentsTagModuleCopy,
} from './screen-copy.js';

describe('getRecentsContinuePracticingCopy', () => {
  it('reduces steady-state copy when recent rows are already visible', () => {
    assert.deepEqual(
      getRecentsContinuePracticingCopy({
        activePlayableItemTitle: 'Kyrie Alto.mp3',
        hasRecentHistory: true,
        savedTrackCount: 2,
      }),
      {
        body: null,
        title: 'Recent rehearsal',
      },
    );
  });

  it('guides the user to save a first track when the library is empty', () => {
    assert.deepEqual(
      getRecentsContinuePracticingCopy({
        activePlayableItemTitle: null,
        hasRecentHistory: false,
        savedTrackCount: 0,
      }),
      {
        body: 'No recent rehearsal yet. Start in Add or Library.',
        title: 'No recent rehearsal yet',
      },
    );
  });

  it('points users with saved tracks toward Library when no active item exists', () => {
    assert.deepEqual(
      getRecentsContinuePracticingCopy({
        activePlayableItemTitle: null,
        hasRecentHistory: false,
        savedTrackCount: 3,
      }),
      {
        body: '3 saved rehearsal tracks are ready in Library. Open Library to continue practicing.',
        title: 'Recent rehearsal entry points',
      },
    );
  });
});

describe('getRecentsTagModuleCopy', () => {
  it('guides the user to add a tag when no saved entity carries one', () => {
    assert.deepEqual(
      getRecentsTagModuleCopy({ hasSavedTagUsage: false }),
      {
        body: 'No tags yet. Tag a track, loop, playlist, or folder in Library to see it here.',
      },
    );
  });

  it('shows the optional-shortcuts hint once real tags exist', () => {
    assert.deepEqual(
      getRecentsTagModuleCopy({ hasSavedTagUsage: true }),
      {
        body: 'Optional tag shortcuts for fast recents scanning.',
      },
    );
  });
});
