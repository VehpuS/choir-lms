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
import { syncActivePlaylistPlaybackSession } from './playlist-session-mode.js';
import {
  buildPlaylistPlaybackSession,
  createTransientPlaybackSession,
  getPlaylistPlaybackCurrentItem,
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
});
