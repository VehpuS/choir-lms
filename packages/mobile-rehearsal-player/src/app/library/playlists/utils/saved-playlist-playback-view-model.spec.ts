/// <reference types="node" />

import assert from 'node:assert/strict';
import { describe, it } from 'node:test';

import {
  PLAYABLE_SOURCE,
  SAVED_LOOP,
} from '../../../test-utils/library-test-fixtures.js';
import {
  buildTrackOnlyWarmupsPlaylist,
  buildWarmupsPlaybackSession,
  buildWarmupsPlaylist,
} from './saved-playlist-test-fixtures.js';
import {
  buildPlaylistPlaybackSession,
  getPlaylistPlaybackActionCopy,
  getPlaylistPlaybackCurrentItem,
  getPlaylistPlaybackSessionSummary,
  getPlaylistQueueModeLabel,
  getPlaylistRepeatModeLabel,
  resolvePlaylistPlaybackAdvance,
  resolvePlaylistPlaybackRewind,
  updatePlaylistPlaybackRepeatMode,
} from './saved-playlist-playback-view-model.js';

describe('saved playlist playback view-model', () => {
  it('builds playlist playback sessions from saved tracks and loops', () => {
    const playlist = buildWarmupsPlaylist();
    const result = buildPlaylistPlaybackSession({
      loops: [SAVED_LOOP],
      mode: 'ordered',
      playlist,
      repeatMode: 'all',
      sources: [PLAYABLE_SOURCE],
    });

    assert.equal(result.issue, null);
    assert.deepEqual(
      result.session && {
        currentItemId: getPlaylistPlaybackCurrentItem(result.session)?.id,
        itemIds: result.session.queue.items.map((item) => item.id),
        mode: result.session.queue.mode,
        repeatMode: result.session.queue.repeatMode,
        requestedItemCount: result.session.requestedItemCount,
        summary: getPlaylistPlaybackSessionSummary(result.session),
      },
      {
        currentItemId: 'track:drive:alto-line',
        itemIds: ['track:drive:alto-line', 'loop:loop-1'],
        mode: 'ordered',
        repeatMode: 'all',
        requestedItemCount: 2,
        summary:
          'Active session • Warmups • item 1 of 2 • Ordered • Repeat all.',
      },
    );
  });

  it('starts ordered playlist playback from a tapped playlist entry', () => {
    const playlist = buildWarmupsPlaylist();
    const result = buildPlaylistPlaybackSession({
      loops: [SAVED_LOOP],
      mode: 'ordered',
      playlist,
      repeatMode: 'off',
      sources: [PLAYABLE_SOURCE],
      startEntryId: playlist.items[1].id,
    });

    assert.equal(result.issue, null);
    assert.equal(result.session?.currentIndex, 1);
    assert.equal(
      result.session && getPlaylistPlaybackCurrentItem(result.session)?.id,
      'loop:loop-1',
    );
  });

  it('advances playlist playback using the shared repeat semantics', () => {
    const builtSession = buildWarmupsPlaybackSession({
      sources: [PLAYABLE_SOURCE],
    });
    const completedSession = {
      ...builtSession,
      currentIndex: 1,
    };
    const offAdvance = resolvePlaylistPlaybackAdvance(completedSession);
    const repeatOneAdvance = resolvePlaylistPlaybackAdvance(
      updatePlaylistPlaybackRepeatMode(builtSession, 'one'),
    );
    const repeatAllAdvance = resolvePlaylistPlaybackAdvance(
      updatePlaylistPlaybackRepeatMode(completedSession, 'all'),
    );

    assert.equal(offAdvance.nextPlayableItem, null);
    assert.equal(offAdvance.nextSession.hasCompleted, true);
    assert.equal(
      repeatOneAdvance.nextPlayableItem?.id,
      'track:drive:alto-line',
    );
    assert.equal(repeatOneAdvance.nextSession.currentIndex, 0);
    assert.equal(
      repeatAllAdvance.nextPlayableItem?.id,
      'track:drive:alto-line',
    );
    assert.equal(repeatAllAdvance.nextSession.currentIndex, 0);
  });

  it('rewinds playlist playback using the shared previous-item semantics', () => {
    const builtSession = buildWarmupsPlaybackSession({
      sources: [PLAYABLE_SOURCE],
    });
    const laterSession = {
      ...builtSession,
      currentIndex: 1,
      hasCompleted: true,
    };
    const offRewind = resolvePlaylistPlaybackRewind(laterSession);
    const repeatAllRewind = resolvePlaylistPlaybackRewind(
      updatePlaylistPlaybackRepeatMode(builtSession, 'all'),
    );

    assert.equal(offRewind.previousPlayableItem?.id, 'track:drive:alto-line');
    assert.equal(offRewind.previousSession.currentIndex, 0);
    assert.equal(offRewind.previousSession.hasCompleted, false);
    assert.equal(repeatAllRewind.previousPlayableItem?.id, 'loop:loop-1');
    assert.equal(repeatAllRewind.previousSession.currentIndex, 1);
  });

  it('keeps ordered and shuffled playback controls as fresh start actions', () => {
    const playlist = buildTrackOnlyWarmupsPlaylist();
    const activeSession = buildWarmupsPlaybackSession({
      loops: [],
      mode: 'shuffle',
      playlist,
      sources: [PLAYABLE_SOURCE],
    });

    assert.deepEqual(
      getPlaylistPlaybackActionCopy({
        activeSession: null,
        isPreparing: false,
        mode: 'ordered',
        playbackState: 'none',
        selectedPlaylist: playlist,
      }),
      {
        disabled: false,
        label: 'Play ordered',
      },
    );
    assert.deepEqual(
      getPlaylistPlaybackActionCopy({
        activeSession,
        isPreparing: false,
        mode: 'shuffle',
        playbackState: 'playing',
        selectedPlaylist: playlist,
      }),
      {
        disabled: false,
        label: 'Shuffle play',
      },
    );
    assert.deepEqual(
      getPlaylistPlaybackActionCopy({
        activeSession: {
          ...activeSession,
          hasCompleted: true,
        },
        isPreparing: false,
        mode: 'shuffle',
        playbackState: 'paused',
        selectedPlaylist: playlist,
      }),
      {
        disabled: false,
        label: 'Shuffle play',
      },
    );
    assert.deepEqual(
      getPlaylistPlaybackActionCopy({
        activeSession,
        isPreparing: false,
        mode: 'ordered',
        playbackState: 'paused',
        selectedPlaylist: playlist,
      }),
      {
        disabled: false,
        label: 'Play ordered',
      },
    );
    assert.equal(getPlaylistQueueModeLabel('shuffle'), 'Shuffle');
    assert.equal(getPlaylistRepeatModeLabel('all'), 'Repeat all');
  });
});
