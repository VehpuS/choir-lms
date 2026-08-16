import assert from 'node:assert/strict';
import { describe, it } from 'node:test';

import { createTrackPlayableItem } from '@org/audio-library-models';

import { PLAYABLE_SOURCE } from '../../../test-utils/library-test-fixtures.js';
import { createTransientPlaybackSession } from './playlist-playback-queue-state.js';
import { syncActivePlaylistPlaybackSession } from './playlist-session-mode.js';
import { queuePlayableItemDuringPlayback } from './saved-playlist-playback-view-model.js';

describe('syncActivePlaylistPlaybackSession queue pruning', () => {
  it('prunes an upcoming queue item whose source has been removed from the library', () => {
    const queuedSource = {
      ...PLAYABLE_SOURCE,
      id: 'drive:queued-tenor-line',
      name: 'Tenor Line.mp3',
    };
    const transientSession = createTransientPlaybackSession({
      activePlayableItem: createTrackPlayableItem(PLAYABLE_SOURCE),
      repeatMode: 'off',
    });
    const queuedSession = queuePlayableItemDuringPlayback({
      activePlayableItem: createTrackPlayableItem(PLAYABLE_SOURCE),
      playableItem: createTrackPlayableItem(queuedSource),
      position: 'next',
      repeatMode: 'off',
      session: transientSession,
    });

    if (!queuedSession) {
      throw new Error('Expected a queued playback session.');
    }

    assert.equal(queuedSession.queue.items.length, 2);

    const syncResult = syncActivePlaylistPlaybackSession({
      currentContext: null,
      loops: [],
      playlists: [],
      session: queuedSession,
      sources: [PLAYABLE_SOURCE],
    });

    assert.deepEqual(
      syncResult.session?.queue.items.map((item) => item.id),
      ['track:drive:alto-line'],
    );
    assert.equal(syncResult.session?.currentIndex, 0);
  });

  it('clamps currentIndex to a remaining item when the current queue item is removed', () => {
    const queuedSource = {
      ...PLAYABLE_SOURCE,
      id: 'drive:queued-tenor-line',
      name: 'Tenor Line.mp3',
    };
    const transientSession = createTransientPlaybackSession({
      activePlayableItem: createTrackPlayableItem(PLAYABLE_SOURCE),
      repeatMode: 'off',
    });
    const queuedSession = queuePlayableItemDuringPlayback({
      activePlayableItem: createTrackPlayableItem(PLAYABLE_SOURCE),
      playableItem: createTrackPlayableItem(queuedSource),
      position: 'next',
      repeatMode: 'off',
      session: transientSession,
    });

    if (!queuedSession) {
      throw new Error('Expected a queued playback session.');
    }

    const syncResult = syncActivePlaylistPlaybackSession({
      currentContext: null,
      loops: [],
      playlists: [],
      session: queuedSession,
      sources: [queuedSource],
    });

    assert.deepEqual(
      syncResult.session?.queue.items.map((item) => item.id),
      ['track:drive:queued-tenor-line'],
    );
    assert.equal(syncResult.session?.currentIndex, 0);
  });

  it('leaves an unaffected transient queue session untouched', () => {
    const queuedSource = {
      ...PLAYABLE_SOURCE,
      id: 'drive:queued-tenor-line',
      name: 'Tenor Line.mp3',
    };
    const transientSession = createTransientPlaybackSession({
      activePlayableItem: createTrackPlayableItem(PLAYABLE_SOURCE),
      repeatMode: 'off',
    });
    const queuedSession = queuePlayableItemDuringPlayback({
      activePlayableItem: createTrackPlayableItem(PLAYABLE_SOURCE),
      playableItem: createTrackPlayableItem(queuedSource),
      position: 'next',
      repeatMode: 'off',
      session: transientSession,
    });

    if (!queuedSession) {
      throw new Error('Expected a queued playback session.');
    }

    const syncResult = syncActivePlaylistPlaybackSession({
      currentContext: null,
      loops: [],
      playlists: [],
      session: queuedSession,
      sources: [PLAYABLE_SOURCE, queuedSource],
    });

    assert.equal(syncResult.session, queuedSession);
  });
});
