import assert from 'node:assert/strict';
import { describe, it } from 'node:test';

import {
  getRecentsContinuePracticingCopy,
  getRecentsShortcutPlayActionCopy,
} from './screen-copy.js';

describe('getRecentsContinuePracticingCopy', () => {
  it('promotes the active item when playback is already in progress', () => {
    assert.deepEqual(
      getRecentsContinuePracticingCopy({
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
      getRecentsContinuePracticingCopy({
        activePlayableItemTitle: null,
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
        savedTrackCount: 3,
      }),
      {
        body: '3 saved rehearsal tracks are ready in Library. Open Library to continue practicing.',
        title: 'Recent rehearsal entry points',
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