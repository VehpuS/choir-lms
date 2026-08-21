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
        isTagDetailVisible: false,
        selectedLoopViewSourceId: null,
      }),
      'browse',
    );
  });

  it('switches to track loop detail when View track loops is active', () => {
    assert.equal(
      resolveSavedRehearsalLibraryDetailMode({
        isPlaylistDetailVisible: false,
        isTagDetailVisible: false,
        selectedLoopViewSourceId: 'drive:alto-line',
      }),
      'track-loop-detail',
    );
  });

  it('switches to tag detail when a tag is selected', () => {
    assert.equal(
      resolveSavedRehearsalLibraryDetailMode({
        isPlaylistDetailVisible: false,
        isTagDetailVisible: true,
        selectedLoopViewSourceId: null,
      }),
      'tag-detail',
    );
  });

  it('keeps playlist detail as the dominant detail mode', () => {
    assert.equal(
      resolveSavedRehearsalLibraryDetailMode({
        isPlaylistDetailVisible: true,
        isTagDetailVisible: true,
        selectedLoopViewSourceId: 'drive:alto-line',
      }),
      'playlist-detail',
    );
  });

  it('prefers tag detail over track loop detail', () => {
    assert.equal(
      resolveSavedRehearsalLibraryDetailMode({
        isPlaylistDetailVisible: false,
        isTagDetailVisible: true,
        selectedLoopViewSourceId: 'drive:alto-line',
      }),
      'tag-detail',
    );
  });

  it('keeps Files as the mixed browse view', () => {
    assert.deepEqual(resolveSavedRehearsalLibraryVisibleSections('files'), {
      showLoopBrowseList: true,
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

  it('keeps Tracks focused on saved tracks only, hiding the Saved loops browse list and playlist cards while still hosting the loop builder', () => {
    assert.deepEqual(resolveSavedRehearsalLibraryVisibleSections('tracks'), {
      showLoopBrowseList: false,
      showLoopSection: true,
      showPlaylistCards: false,
      showPlaylistSection: false,
      showSourceGroup: true,
    });
  });

  it('lets Loops focus on loop playback and management only', () => {
    assert.deepEqual(resolveSavedRehearsalLibraryVisibleSections('loops'), {
      showLoopBrowseList: true,
      showLoopSection: true,
      showPlaylistCards: false,
      showPlaylistSection: false,
      showSourceGroup: false,
    });
  });

  it('keeps Playlists focused on playlist surfaces', () => {
    assert.deepEqual(resolveSavedRehearsalLibraryVisibleSections('playlists'), {
      showLoopBrowseList: false,
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

  it('keeps Tags free of the shared browse sections, since it renders its own tag list', () => {
    assert.deepEqual(resolveSavedRehearsalLibraryVisibleSections('tags'), {
      showLoopBrowseList: false,
      showLoopSection: false,
      showPlaylistCards: false,
      showPlaylistSection: false,
      showSourceGroup: false,
    });
    assert.deepEqual(resolveSavedRehearsalLibraryViewCopy('tags'), {
      body: 'Browse every tag in use across your saved library, with usage counts, sorting, and search.',
      eyebrow: 'Library',
      title: 'Tags',
    });
  });
});
