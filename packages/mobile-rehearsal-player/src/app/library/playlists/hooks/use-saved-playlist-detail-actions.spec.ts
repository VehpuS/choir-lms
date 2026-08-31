/// <reference types="node" />

import assert from 'node:assert/strict';
import { describe, it } from 'node:test';

import { PLAYABLE_SOURCE } from '../../../test-utils/library-test-fixtures.js';
import { buildWarmupsPlaylist } from '../utils/saved-playlist-test-fixtures.js';
import { useSavedPlaylistDetailActions } from './use-saved-playlist-detail-actions.js';

describe('useSavedPlaylistDetailActions', () => {
  it('starts ordered playback for the selected playlist', () => {
    const playlist = buildWarmupsPlaylist();
    const calls: Array<Record<string, unknown>> = [];
    const actions = useSavedPlaylistDetailActions({
      onEditPlaylistTags: () => undefined,
      savedLoops: [],
      savedSources: [PLAYABLE_SOURCE],
      selectedPlaylist: playlist,
      toggleActivePlayback: async () => undefined,
      togglePlaylistPlayback: async (options) => {
        calls.push(options);
      },
    });

    actions.playOrderedPlaylist();

    assert.equal(calls.length, 1);
    assert.equal(calls[0]?.mode, 'ordered');
    assert.equal(calls[0]?.playlist, playlist);
  });

  it('starts shuffle playback for the selected playlist', () => {
    const playlist = buildWarmupsPlaylist();
    const calls: Array<Record<string, unknown>> = [];
    const actions = useSavedPlaylistDetailActions({
      onEditPlaylistTags: () => undefined,
      savedLoops: [],
      savedSources: [PLAYABLE_SOURCE],
      selectedPlaylist: playlist,
      toggleActivePlayback: async () => undefined,
      togglePlaylistPlayback: async (options) => {
        calls.push(options);
      },
    });

    actions.playShufflePlaylist();

    assert.equal(calls.length, 1);
    assert.equal(calls[0]?.mode, 'shuffle');
    assert.equal(calls[0]?.playlist, playlist);
  });

  it('does nothing for either mode when no playlist is selected', () => {
    const calls: Array<Record<string, unknown>> = [];
    const actions = useSavedPlaylistDetailActions({
      onEditPlaylistTags: () => undefined,
      savedLoops: [],
      savedSources: [],
      selectedPlaylist: null,
      toggleActivePlayback: async () => undefined,
      togglePlaylistPlayback: async (options) => {
        calls.push(options);
      },
    });

    actions.playOrderedPlaylist();
    actions.playShufflePlaylist();

    assert.equal(calls.length, 0);
  });
});
