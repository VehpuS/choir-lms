import assert from 'node:assert/strict';
import { describe, it } from 'node:test';

import {
  addLoopToPlaylist,
  addTrackToPlaylist,
  createLoopPlayableItem,
  createPlaylist,
} from '@org/audio-library-models';

import {
  PLAYABLE_SOURCE,
  SAVED_LOOP,
} from '../../../test-utils/library-test-fixtures.js';
import {
  bindQueueToPlaylistPlaybackSession,
  syncActivePlaylistPlaybackSession,
} from './playlist-session-mode.js';
import {
  buildPlaylistPlaybackSession,
  createTransientPlaybackSession,
  getPlaylistPlaybackCurrentItem,
  queuePlayableItemDuringPlayback,
} from './saved-playlist-playback-view-model.js';

describe('syncActivePlaylistPlaybackSession', () => {
  it('syncs edited loop data into the active queue session', () => {
    const playlist = addLoopToPlaylist(
      createPlaylist({
        createdAt: '2026-05-12T00:00:00.000Z',
        name: 'Warmups',
        ownerId: 'user-1',
      }),
      SAVED_LOOP,
      '2026-05-12T00:01:00.000Z',
    );
    const activeSession = buildPlaylistPlaybackSession({
      loops: [SAVED_LOOP],
      mode: 'ordered',
      playlist,
      repeatMode: 'off',
      sources: [PLAYABLE_SOURCE],
    }).session;

    if (!activeSession) {
      throw new Error('Expected an active loop session.');
    }

    const editedLoop = {
      ...SAVED_LOOP,
      name: 'Entrance cue revised',
      startMs: 15000,
      endMs: 24000,
    };
    const syncResult = syncActivePlaylistPlaybackSession({
      currentContext: {
        loops: [SAVED_LOOP],
        playlist,
        sources: [PLAYABLE_SOURCE],
      },
      loops: [editedLoop],
      playlists: [playlist],
      session: activeSession,
      sources: [PLAYABLE_SOURCE],
    });

    assert.equal(syncResult.issue, null);
    assert.equal(syncResult.session?.currentIndex, 0);
    assert.deepEqual(
      getPlaylistPlaybackCurrentItem(syncResult.session ?? activeSession),
      {
        ...getPlaylistPlaybackCurrentItem(activeSession),
        title: 'Entrance cue revised',
        range: {
          startMs: 15000,
          endMs: 24000,
        },
      },
    );
  });

  it('reuses the active session when sync does not change playlist playback', () => {
    const playlist = addTrackToPlaylist(
      createPlaylist({
        createdAt: '2026-05-12T00:00:00.000Z',
        name: 'Warmups',
        ownerId: 'user-1',
      }),
      PLAYABLE_SOURCE,
      '2026-05-12T00:01:00.000Z',
    );
    const activeSession = buildPlaylistPlaybackSession({
      loops: [],
      mode: 'ordered',
      playlist,
      repeatMode: 'off',
      sources: [PLAYABLE_SOURCE],
    }).session;

    if (!activeSession) {
      throw new Error('Expected an active playlist session.');
    }

    const syncResult = syncActivePlaylistPlaybackSession({
      currentContext: {
        loops: [],
        playlist,
        sources: [PLAYABLE_SOURCE],
      },
      loops: [],
      playlists: [playlist],
      session: activeSession,
      sources: [PLAYABLE_SOURCE],
    });

    assert.equal(syncResult.issue, null);
    assert.equal(syncResult.session, activeSession);
  });

  it('syncs edited loop data in transient queue sessions', () => {
    const activeLoop = createLoopPlayableItem(SAVED_LOOP, PLAYABLE_SOURCE);
    const transientSession = createTransientPlaybackSession({
      activePlayableItem: activeLoop,
      repeatMode: 'off',
    });
    const editedLoop = {
      ...SAVED_LOOP,
      name: 'Entrance cue revised',
      startMs: 15000,
      endMs: 24000,
    };
    const syncResult = syncActivePlaylistPlaybackSession({
      currentContext: null,
      loops: [editedLoop],
      playlists: [],
      session: transientSession,
      sources: [PLAYABLE_SOURCE],
    });

    assert.equal(syncResult.issue, null);
    assert.deepEqual(
      getPlaylistPlaybackCurrentItem(syncResult.session ?? transientSession),
      {
        ...activeLoop,
        title: 'Entrance cue revised',
        range: {
          startMs: 15000,
          endMs: 24000,
        },
      },
    );
  });

  it('binds a saved copy of an existing queue to the new playlist without changing queue order', () => {
    const originalPlaylist = addLoopToPlaylist(
      addTrackToPlaylist(
        createPlaylist({
          createdAt: '2026-05-12T00:00:00.000Z',
          name: 'Warmups',
          ownerId: 'user-1',
        }),
        PLAYABLE_SOURCE,
        '2026-05-12T00:01:00.000Z',
      ),
      SAVED_LOOP,
      '2026-05-12T00:02:00.000Z',
    );
    const activeSession = buildPlaylistPlaybackSession({
      loops: [SAVED_LOOP],
      mode: 'ordered',
      playlist: originalPlaylist,
      repeatMode: 'off',
      sources: [PLAYABLE_SOURCE],
      startEntryId: originalPlaylist.items[1]?.id,
    }).session;

    if (!activeSession) {
      throw new Error('Expected an active playlist session.');
    }

    const queuedSource = {
      ...PLAYABLE_SOURCE,
      id: 'drive:tenor-line',
      name: 'Tenor Line.mp3',
    };
    const queuedSession = queuePlayableItemDuringPlayback({
      activePlayableItem: getPlaylistPlaybackCurrentItem(activeSession),
      playableItem: {
        ...getPlaylistPlaybackCurrentItem(activeSession),
        id: 'track:drive:tenor-line',
        source: queuedSource,
        sourceId: queuedSource.id,
        title: queuedSource.name,
        kind: 'track',
        range: {
          startMs: 0,
          endMs: queuedSource.durationMs ?? null,
        },
        description: 'Full track',
        loopId: undefined,
      },
      position: 'next',
      repeatMode: 'off',
      session: activeSession,
    });

    if (!queuedSession) {
      throw new Error('Expected a queued session.');
    }

    const savedPlaylist = addTrackToPlaylist(
      addLoopToPlaylist(
        addTrackToPlaylist(
          createPlaylist({
            createdAt: '2026-06-14T20:48:00.000Z',
            name: 'June set',
            ownerId: 'user-1',
          }),
          PLAYABLE_SOURCE,
          '2026-06-14T20:49:00.000Z',
        ),
        SAVED_LOOP,
        '2026-06-14T20:50:00.000Z',
      ),
      queuedSource,
      '2026-06-14T20:51:00.000Z',
    );
    const reboundSession = bindQueueToPlaylistPlaybackSession({
      playlist: savedPlaylist,
      session: queuedSession,
    });

    assert.equal(reboundSession?.playlistId, savedPlaylist.id);
    assert.equal(reboundSession?.playlistName, 'June set');
    assert.equal(reboundSession?.currentIndex, 1);
    assert.deepEqual(
      reboundSession?.queue.items.map((item) => item.title),
      ['Alto Line.mp3', 'Entrance cue', 'Tenor Line.mp3'],
    );
    assert.deepEqual(
      reboundSession?.queue.items.map((item) => item.playlistEntryId),
      savedPlaylist.items.map((item) => item.id),
    );
    assert.equal(
      getPlaylistPlaybackCurrentItem(reboundSession ?? queuedSession)
        ?.playlistEntryId,
      savedPlaylist.items[1]?.id,
    );
  });
});
