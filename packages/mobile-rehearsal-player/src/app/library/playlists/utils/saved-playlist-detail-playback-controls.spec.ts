/// <reference types="node" />

import assert from 'node:assert/strict';
import { describe, it } from 'node:test';

import { PLAYABLE_SOURCE } from '../../../test-utils/library-test-fixtures.js';
import {
  buildTrackOnlyWarmupsPlaylist,
  buildWarmupsPlaybackSession,
} from './saved-playlist-test-fixtures.js';
import { getPlaylistDetailPlaybackControls } from './saved-playlist-detail-playback-controls.js';
import { getPlaylistPlaybackActionCopy } from './saved-playlist-playback-view-model.js';

describe('saved playlist detail playback controls', () => {
  it('maps playlist detail playback controls to icon-first ordered and shuffle actions', () => {
    const playlist = buildTrackOnlyWarmupsPlaylist();
    const activeSession = buildWarmupsPlaybackSession({
      loops: [],
      mode: 'shuffle',
      playlist,
      sources: [PLAYABLE_SOURCE],
    });

    assert.deepEqual(
      getPlaylistDetailPlaybackControls({
        activeMode: activeSession.queue.mode,
        orderedAction: getPlaylistPlaybackActionCopy({
          activeSession,
          isPreparing: false,
          mode: 'ordered',
          playbackState: 'playing',
          selectedPlaylist: playlist,
        }),
        shuffleAction: getPlaylistPlaybackActionCopy({
          activeSession,
          isPreparing: false,
          mode: 'shuffle',
          playbackState: 'playing',
          selectedPlaylist: playlist,
        }),
      }),
      [
        {
          accessibilityLabel: 'Play ordered',
          disabled: false,
          iconName: 'play',
          label: 'Ordered',
          mode: 'ordered',
          selected: false,
          tone: 'secondary',
        },
        {
          accessibilityLabel: 'Shuffle play',
          disabled: false,
          iconName: 'shuffle',
          label: 'Shuffle',
          mode: 'shuffle',
          selected: true,
          tone: 'primary',
        },
      ],
    );

    assert.deepEqual(
      getPlaylistDetailPlaybackControls({
        activeMode: null,
        orderedAction: getPlaylistPlaybackActionCopy({
          activeSession: null,
          isPreparing: false,
          mode: 'ordered',
          playbackState: 'none',
          selectedPlaylist: null,
        }),
        shuffleAction: getPlaylistPlaybackActionCopy({
          activeSession: null,
          isPreparing: false,
          mode: 'shuffle',
          playbackState: 'none',
          selectedPlaylist: null,
        }),
      }).map((control) => {
        return {
          accessibilityLabel: control.accessibilityLabel,
          disabled: control.disabled,
          mode: control.mode,
          tone: control.tone,
        };
      }),
      [
        {
          accessibilityLabel: 'Select playlist to start ordered playback',
          disabled: true,
          mode: 'ordered',
          tone: 'primary',
        },
        {
          accessibilityLabel: 'Select playlist to start shuffle playback',
          disabled: true,
          mode: 'shuffle',
          tone: 'secondary',
        },
      ],
    );
  });
});
