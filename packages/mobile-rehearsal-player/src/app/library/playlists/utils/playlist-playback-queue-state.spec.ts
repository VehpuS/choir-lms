/// <reference types="node" />

import assert from 'node:assert/strict';
import { describe, it } from 'node:test';

import { createTrackPlayableItem } from '@org/audio-library-models';

import { PLAYABLE_SOURCE } from '../../../test-utils/library-test-fixtures.js';
import {
  buildThreeItemQueueSession,
  buildTrackOnlyWarmupsPlaylist,
  buildWarmupsPlaybackSession,
} from './saved-playlist-test-fixtures.js';
import {
  canShowQueuePlaylistActions,
  canUpdateQueuePlaylist,
  getPlaylistPlaybackCurrentItem,
  movePlaylistPlaybackQueueItem,
  movePlaylistPlaybackQueueItemToEnd,
  movePlaylistPlaybackQueueItemToStart,
  queuePlayableItemAsNext,
  queuePlayableItemAsUpNext,
  queuePlayableItemDuringPlayback,
  removePlaylistPlaybackQueueItem,
  selectPlaylistPlaybackQueueItem,
} from './saved-playlist-playback-view-model.js';

describe('playlist playback queue state', () => {
  it('inserts Play next items directly after the active queue item', () => {
    const builtSession = buildWarmupsPlaybackSession();
    const currentItem = getPlaylistPlaybackCurrentItem(builtSession);

    if (!currentItem) {
      throw new Error('Expected an active queue item.');
    }

    const insertedTrack = {
      ...currentItem,
      id: 'track:drive:soprano-line',
      sourceId: 'drive:soprano-line',
      title: 'Soprano Line.mp3',
      playlistEntryId: undefined,
    };
    const queuedSession = queuePlayableItemAsNext(builtSession, insertedTrack);

    assert.equal(queuedSession.currentIndex, builtSession.currentIndex);
    assert.equal(queuedSession.queue.items[0]?.id, 'track:drive:alto-line');
    assert.equal(queuedSession.queue.items[1]?.id, 'track:drive:soprano-line');
    assert.equal(queuedSession.queue.items[2]?.id, 'loop:loop-1');
    assert.equal(queuedSession.requestedItemCount, 3);
  });

  it('appends Add to queue items to the end of the queue', () => {
    const builtSession = buildWarmupsPlaybackSession();
    const appendedTrack = {
      ...builtSession.queue.items[0],
      id: 'track:drive:tenor-line',
      sourceId: 'drive:tenor-line',
      title: 'Tenor Line.mp3',
      playlistEntryId: undefined,
    };
    const queuedSession = queuePlayableItemAsUpNext(
      builtSession,
      appendedTrack,
    );

    assert.equal(queuedSession.currentIndex, builtSession.currentIndex);
    assert.equal(queuedSession.queue.items[0]?.id, 'track:drive:alto-line');
    assert.equal(queuedSession.queue.items[1]?.id, 'loop:loop-1');
    assert.equal(queuedSession.queue.items[2]?.id, 'track:drive:tenor-line');
    assert.equal(queuedSession.requestedItemCount, 3);
  });

  it('promotes standalone playback into a transient queue for Play next', () => {
    const activePlayableItem = createTrackPlayableItem(PLAYABLE_SOURCE);
    const queuedTrack = {
      ...activePlayableItem,
      id: 'track:drive:soprano-line',
      sourceId: 'drive:soprano-line',
      title: 'Soprano Line.mp3',
    };
    const queuedSession = queuePlayableItemDuringPlayback({
      activePlayableItem,
      playableItem: queuedTrack,
      position: 'next',
      repeatMode: 'one',
      session: null,
    });

    assert.equal(queuedSession?.currentIndex, 0);
    assert.equal(queuedSession?.playlistId, 'transient-queue');
    assert.equal(queuedSession?.playlistName, 'Current queue');
    assert.equal(queuedSession?.queue.repeatMode, 'one');
    assert.equal(queuedSession?.queue.items[0]?.id, activePlayableItem.id);
    assert.equal(queuedSession?.queue.items[1]?.id, queuedTrack.id);
    assert.equal(queuedSession?.requestedItemCount, 2);
  });

  it('shows queue playlist actions for both transient and playlist-backed sessions', () => {
    const transientSession = queuePlayableItemDuringPlayback({
      activePlayableItem: createTrackPlayableItem(PLAYABLE_SOURCE),
      playableItem: createTrackPlayableItem({
        ...PLAYABLE_SOURCE,
        id: 'drive:tenor-line',
        name: 'Tenor Line.mp3',
      }),
      position: 'next',
      repeatMode: 'off',
      session: null,
    });
    const playlistSession = buildWarmupsPlaybackSession({
      loops: [],
      playlist: buildTrackOnlyWarmupsPlaylist(),
      sources: [PLAYABLE_SOURCE],
    });

    assert.equal(canShowQueuePlaylistActions(null), false);
    assert.equal(canShowQueuePlaylistActions(transientSession), true);
    assert.equal(canShowQueuePlaylistActions(playlistSession), true);
    assert.equal(canUpdateQueuePlaylist(null), false);
    assert.equal(canUpdateQueuePlaylist(transientSession), false);
    assert.equal(canUpdateQueuePlaylist(playlistSession), true);
  });

  it('returns null when queue actions run without an active item or queue session', () => {
    const queuedSession = queuePlayableItemDuringPlayback({
      activePlayableItem: null,
      playableItem: createTrackPlayableItem(PLAYABLE_SOURCE),
      position: 'up-next',
      repeatMode: 'off',
      session: null,
    });

    assert.equal(queuedSession, null);
  });

  it('reorders non-current queue items without losing the active item', () => {
    const builtSession = {
      ...buildThreeItemQueueSession(),
      currentIndex: 1,
    };
    const movedSession = movePlaylistPlaybackQueueItem(builtSession, 0, 2);

    assert.equal(movedSession.currentIndex, 0);
    assert.equal(
      getPlaylistPlaybackCurrentItem(movedSession)?.id,
      'loop:loop-1',
    );
    assert.deepEqual(
      movedSession.queue.items.map((item) => item.id),
      ['loop:loop-1', 'track:drive:tenor-line', 'track:drive:alto-line'],
    );
  });

  it('moves the active queue item to the start or end and updates currentIndex', () => {
    const builtSession = buildThreeItemQueueSession();
    const movedToEndSession = movePlaylistPlaybackQueueItemToEnd(
      builtSession,
      0,
    );
    const movedToStartSession = movePlaylistPlaybackQueueItemToStart(
      {
        ...builtSession,
        currentIndex: 2,
      },
      2,
    );

    assert.equal(movedToEndSession.currentIndex, 2);
    assert.equal(
      getPlaylistPlaybackCurrentItem(movedToEndSession)?.id,
      'track:drive:alto-line',
    );
    assert.deepEqual(
      movedToEndSession.queue.items.map((item) => item.id),
      ['loop:loop-1', 'track:drive:tenor-line', 'track:drive:alto-line'],
    );
    assert.equal(movedToStartSession.currentIndex, 0);
    assert.equal(
      getPlaylistPlaybackCurrentItem(movedToStartSession)?.id,
      'track:drive:tenor-line',
    );
  });

  it('removes non-current queue items and keeps current-row removal stable', () => {
    const builtSession = {
      ...buildThreeItemQueueSession(),
      currentIndex: 1,
    };
    const removedSession = removePlaylistPlaybackQueueItem(builtSession, 2);
    const unchangedSession = removePlaylistPlaybackQueueItem(builtSession, 1);

    assert.equal(removedSession.currentIndex, 1);
    assert.equal(removedSession.requestedItemCount, 2);
    assert.deepEqual(
      removedSession.queue.items.map((item) => item.id),
      ['track:drive:alto-line', 'loop:loop-1'],
    );
    assert.equal(unchangedSession, builtSession);
  });

  it('selects a queue item for direct playback without changing queue order', () => {
    const builtSession = buildThreeItemQueueSession();
    const selection = selectPlaylistPlaybackQueueItem(builtSession, 2);

    assert.equal(selection.nextSession.currentIndex, 2);
    assert.equal(selection.nextSession.hasCompleted, false);
    assert.equal(selection.playableItem?.id, 'track:drive:tenor-line');
    assert.deepEqual(
      selection.nextSession.queue.items.map((item) => item.id),
      builtSession.queue.items.map((item) => item.id),
    );
  });
});
