import assert from 'node:assert/strict';
import { describe, it } from 'node:test';

import {
  addLoopToPlaylist,
  addTrackToPlaylist,
  createPlaylist,
} from '@org/audio-library-models';

import {
  PLAYABLE_SOURCE,
  SAVED_LOOP,
} from '../../test-utils/library-test-fixtures.js';
import {
  rebuildPlaylistPlaybackSessionForMode,
  syncActivePlaylistContext,
} from '../utils/playlist-session-mode.js';
import {
  buildPlaylistPlaybackSession,
  getPlaylistPlaybackCurrentItem,
} from '../utils/saved-playlist-playback-view-model.js';

describe('rebuildPlaylistPlaybackSessionForMode', () => {
  it('rebuilds the queue around the current playlist entry when mode changes', () => {
    const playlist = addLoopToPlaylist(
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
    const orderedSession = buildPlaylistPlaybackSession({
      loops: [SAVED_LOOP],
      mode: 'ordered',
      playlist,
      repeatMode: 'all',
      sources: [PLAYABLE_SOURCE],
      startEntryId: playlist.items[1].id,
    }).session;

    if (!orderedSession) {
      throw new Error('Expected an ordered playlist session.');
    }

    const shuffledSession = rebuildPlaylistPlaybackSessionForMode({
      loops: [SAVED_LOOP],
      mode: 'shuffle',
      playlist,
      random: () => 0,
      session: orderedSession,
      sources: [PLAYABLE_SOURCE],
    }).session;

    assert.equal(shuffledSession?.queue.mode, 'shuffle');
    assert.equal(
      shuffledSession && getPlaylistPlaybackCurrentItem(shuffledSession)?.id,
      'loop:loop-1',
    );

    const restoredSession =
      shuffledSession &&
      rebuildPlaylistPlaybackSessionForMode({
        loops: [SAVED_LOOP],
        mode: 'ordered',
        playlist,
        session: shuffledSession,
        sources: [PLAYABLE_SOURCE],
      }).session;

    assert.equal(restoredSession?.queue.mode, 'ordered');
    assert.equal(restoredSession?.currentIndex, 1);
  });

  it('uses the latest persisted playlist when queue mode rebuilds', () => {
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
      repeatMode: 'all',
      sources: [PLAYABLE_SOURCE],
      startEntryId: originalPlaylist.items[1].id,
    }).session;

    if (!activeSession) {
      throw new Error('Expected an active playlist session.');
    }

    const persistedPlaylist = addTrackToPlaylist(
      originalPlaylist,
      PLAYABLE_SOURCE,
      '2026-05-12T00:03:00.000Z',
    );
    const syncedContext = syncActivePlaylistContext({
      currentContext: {
        loops: [SAVED_LOOP],
        playlist: originalPlaylist,
        sources: [PLAYABLE_SOURCE],
      },
      loops: [SAVED_LOOP],
      playlists: [persistedPlaylist],
      session: activeSession,
      sources: [PLAYABLE_SOURCE],
    });

    const rebuiltSession = syncedContext
      ? rebuildPlaylistPlaybackSessionForMode({
          loops: syncedContext.loops,
          mode: 'shuffle',
          playlist: syncedContext.playlist,
          random: () => 0,
          session: activeSession,
          sources: syncedContext.sources,
        }).session
      : null;

    assert.equal(rebuiltSession?.queue.items.length, 3);
    assert.equal(
      rebuiltSession &&
        getPlaylistPlaybackCurrentItem(rebuiltSession)?.playlistEntryId,
      originalPlaylist.items[1].id,
    );
  });
});