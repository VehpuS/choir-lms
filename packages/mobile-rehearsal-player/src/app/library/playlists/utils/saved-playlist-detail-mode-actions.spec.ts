/// <reference types="node" />

import assert from 'node:assert/strict';
import { describe, it } from 'node:test';

import { PLAYABLE_SOURCE } from '../../../test-utils/library-test-fixtures.js';
import { getPlaylistDetailModeActions } from './saved-playlist-detail-mode-actions.js';
import {
  buildWarmupsPlaybackSession,
  buildWarmupsPlaylist,
} from './saved-playlist-test-fixtures.js';

describe('saved playlist detail mode actions', () => {
  it('exposes ordered and shuffle as icon-first actions with adjacent mode labels, not "Play ordered"/"Shuffle play" copy', () => {
    const playlist = buildWarmupsPlaylist();
    const actions = getPlaylistDetailModeActions({
      activeSession: null,
      isPreparing: false,
      playbackState: 'none',
      selectedPlaylist: playlist,
    });

    assert.deepEqual(
      actions.map((action) => ({
        icon: action.icon,
        label: action.label,
        mode: action.mode,
      })),
      [
        { icon: 'play', label: 'Ordered', mode: 'ordered' },
        { icon: 'shuffle', label: 'Shuffle', mode: 'shuffle' },
      ],
    );

    for (const action of actions) {
      assert.notEqual(action.label, 'Play ordered');
      assert.notEqual(action.label, 'Shuffle play');
    }
  });

  it('marks neither action selected when no session is active for this playlist', () => {
    const playlist = buildWarmupsPlaylist();
    const actions = getPlaylistDetailModeActions({
      activeSession: null,
      isPreparing: false,
      playbackState: 'none',
      selectedPlaylist: playlist,
    });

    assert.deepEqual(
      actions.map((action) => action.selected),
      [false, false],
    );
  });

  it('marks only the active queue mode selected for the matching playlist', () => {
    const playlist = buildWarmupsPlaylist();
    const activeSession = buildWarmupsPlaybackSession({
      mode: 'shuffle',
      playlist,
      sources: [PLAYABLE_SOURCE],
    });
    const actions = getPlaylistDetailModeActions({
      activeSession,
      isPreparing: false,
      playbackState: 'playing',
      selectedPlaylist: playlist,
    });

    assert.deepEqual(
      Object.fromEntries(
        actions.map((action) => [action.mode, action.selected]),
      ),
      { ordered: false, shuffle: true },
    );
  });

  it('does not mark an action selected when the active session belongs to a different playlist', () => {
    const playlist = buildWarmupsPlaylist();
    const otherPlaylistSession = {
      ...buildWarmupsPlaybackSession({
        mode: 'ordered',
        playlist,
        sources: [PLAYABLE_SOURCE],
      }),
      playlistId: 'a-different-playlist',
    };
    const actions = getPlaylistDetailModeActions({
      activeSession: otherPlaylistSession,
      isPreparing: false,
      playbackState: 'playing',
      selectedPlaylist: playlist,
    });

    assert.deepEqual(
      actions.map((action) => action.selected),
      [false, false],
    );
  });

  it('disables both actions when the playlist has no items, matching the shared action-copy rule', () => {
    const emptyPlaylist = { ...buildWarmupsPlaylist(), items: [] };
    const actions = getPlaylistDetailModeActions({
      activeSession: null,
      isPreparing: false,
      playbackState: 'none',
      selectedPlaylist: emptyPlaylist,
    });

    assert.deepEqual(
      actions.map((action) => action.disabled),
      [true, true],
    );
  });
});
