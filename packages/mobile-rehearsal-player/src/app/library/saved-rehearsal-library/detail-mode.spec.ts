import assert from 'node:assert/strict';
import { describe, it } from 'node:test';

import {
  resolveSavedRehearsalLibraryDetailMode,
  resolveSavedRehearsalLibraryViewCopy,
  resolveSavedRehearsalLibraryVisibleSections,
} from './detail-mode.js';

describe('saved rehearsal library detail view-model', () => {
  it('stays in browse mode when no detail surface is active', () => {
    assert.equal(
      resolveSavedRehearsalLibraryDetailMode({
        isPlaylistDetailVisible: false,
        selectedLoopViewSourceId: null,
      }),
      'browse',
    );
  });

  it('switches to track loop detail when View track loops is active', () => {
    assert.equal(
      resolveSavedRehearsalLibraryDetailMode({
        isPlaylistDetailVisible: false,
        selectedLoopViewSourceId: 'drive:alto-line',
      }),
      'track-loop-detail',
    );
  });

  it('keeps playlist detail as the dominant detail mode', () => {
    assert.equal(
      resolveSavedRehearsalLibraryDetailMode({
        isPlaylistDetailVisible: true,
        selectedLoopViewSourceId: 'drive:alto-line',
      }),
      'playlist-detail',
    );
  });

  it('keeps Files as the mixed browse view', () => {
    assert.deepEqual(resolveSavedRehearsalLibraryVisibleSections('files'), {
      showLoopSection: true,
      showPlaylistCards: true,
      showPlaylistSection: true,
      showSourceGroup: true,
    });
    assert.deepEqual(resolveSavedRehearsalLibraryViewCopy('files'), {
      body: 'Manage saved items and folders across tracks, loops, and playlists.',
      eyebrow: 'Library',
      title: 'Files',
    });
  });

  it('keeps Tracks focused on saved-track-first browsing', () => {
    assert.deepEqual(resolveSavedRehearsalLibraryVisibleSections('tracks'), {
      showLoopSection: true,
      showPlaylistCards: true,
      showPlaylistSection: false,
      showSourceGroup: true,
    });
  });

  it('lets Loops focus on loop playback and management only', () => {
    assert.deepEqual(resolveSavedRehearsalLibraryVisibleSections('loops'), {
      showLoopSection: true,
      showPlaylistCards: false,
      showPlaylistSection: false,
      showSourceGroup: false,
    });
  });

  it('keeps Playlists focused on playlist surfaces', () => {
    assert.deepEqual(resolveSavedRehearsalLibraryVisibleSections('playlists'), {
      showLoopSection: false,
      showPlaylistCards: true,
      showPlaylistSection: true,
      showSourceGroup: false,
    });
    assert.deepEqual(resolveSavedRehearsalLibraryViewCopy('playlists'), {
      body: 'Open, create, and manage saved rehearsal playlists in one place.',
      eyebrow: 'Library',
      title: 'Playlists',
    });
  });
});
