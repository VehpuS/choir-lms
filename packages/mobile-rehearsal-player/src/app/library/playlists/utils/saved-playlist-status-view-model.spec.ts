/// <reference types="node" />

import assert from 'node:assert/strict';
import { describe, it } from 'node:test';

import {
  getSavedPlaylistsStatusCopy,
  getSelectedPlaylistIssue,
} from './saved-playlist-status-view-model.js';

describe('saved playlist status view-model', () => {
  it('keeps empty playlist status focused on the running-order job', () => {
    assert.deepEqual(
      getSavedPlaylistsStatusCopy({
        isLoading: false,
        issue: null,
        savedPlaylistCount: 0,
      }),
      {
        title: 'No playlists yet',
        message:
          'Create a playlist, then add saved tracks or loops from Library to build a rehearsal running order.',
        tone: 'neutral',
      },
    );
  });

  it('summarizes ready-state copy for saved playlists', () => {
    assert.deepEqual(
      getSavedPlaylistsStatusCopy({
        isLoading: false,
        issue: null,
        savedPlaylistCount: 1,
      }),
      {
        title: 'Saved playlists ready',
        message: '1 playlist ready for saved tracks and loops.',
        tone: 'ready',
      },
    );
  });

  it('only maps a playlist issue when both ids are present and equal', () => {
    assert.equal(getSelectedPlaylistIssue(null, null), null);
    assert.equal(
      getSelectedPlaylistIssue(
        {
          kind: 'save',
          title: 'Could not save playlist',
          message: 'Playlist storage is unavailable.',
        },
        null,
      ),
      null,
    );
    assert.equal(
      getSelectedPlaylistIssue(
        {
          kind: 'save',
          playlistId: 'playlist-1',
          title: 'Could not save playlist',
          message: 'Playlist storage is unavailable.',
        },
        'playlist-2',
      ),
      null,
    );
    assert.deepEqual(
      getSelectedPlaylistIssue(
        {
          kind: 'save',
          playlistId: 'playlist-1',
          title: 'Could not save playlist',
          message: 'Playlist storage is unavailable.',
        },
        'playlist-1',
      ),
      {
        title: 'Could not save playlist',
        message: 'Playlist storage is unavailable.',
      },
    );
  });
});
