import assert from 'node:assert/strict';
import { describe, it } from 'node:test';

import {
  addLoopToPlaylist,
  addTrackToPlaylist,
  createLoopPlayableItem,
  createPlaylist,
  createTrackPlayableItem,
} from '@org/audio-library-models';

import {
  PLAYABLE_SOURCE,
  SAVED_LOOP,
} from '../../test-utils/library-test-fixtures.js';
import {
  rebuildPlaylistPlaybackSessionForMode,
  syncActivePlaylistContext,
} from '../../library/utils/playlist-session-mode.js';
import {
  buildPlaylistPlaybackSession,
  getPlaylistPlaybackCurrentItem,
} from '../../library/utils/saved-playlist-playback-view-model.js';
import {
  SHELL_DESTINATIONS,
  getMiniPlayerSummary,
  getNowPlayingSurfaceSummary,
  getUpNextSurfaceSummary,
} from '../shell-model.js';

describe('SHELL_DESTINATIONS', () => {
  it('defines the Home, Search, and Library shell order', () => {
    assert.deepEqual(
      SHELL_DESTINATIONS.map((destination) => destination.label),
      ['Home', 'Search', 'Library'],
    );
  });
});

describe('getMiniPlayerSummary', () => {
  it('returns null when no rehearsal item is active', () => {
    assert.equal(
      getMiniPlayerSummary({
        activePlayableItem: null,
        isPlaybackPreparing: false,
        playbackPositionSeconds: 0,
        playbackState: 'none',
      }),
      null,
    );
  });

  it('summarizes active playback progress for the mini-player', () => {
    const summary = getMiniPlayerSummary({
      activePlayableItem: createTrackPlayableItem(PLAYABLE_SOURCE),
      isPlaybackPreparing: false,
      playbackPositionSeconds: 18,
      playbackState: 'playing',
    });

    assert.deepEqual(summary, {
      detail: 'Saved rehearsal library • Single item playback',
      status: 'Playing • 0:18 of 3:05',
      title: 'Alto Line.mp3',
    });
  });

  it('prefers a loading state while playback is preparing', () => {
    const summary = getMiniPlayerSummary({
      activePlayableItem: createTrackPlayableItem(PLAYABLE_SOURCE),
      isPlaybackPreparing: true,
      playbackPositionSeconds: 4,
      playbackState: 'paused',
    });

    assert.equal(summary?.status, 'Loading • 0:04 of 3:05');
  });

  it('includes active playlist queue context when playback started from a playlist', () => {
    const playlistSession = buildPlaylistPlaybackSession({
      loops: [],
      mode: 'shuffle',
      playlist: addTrackToPlaylist(
        createPlaylist({
          createdAt: '2026-05-12T00:00:00.000Z',
          name: 'Warmups',
          ownerId: 'user-1',
        }),
        PLAYABLE_SOURCE,
        '2026-05-12T00:01:00.000Z',
      ),
      repeatMode: 'all',
      sources: [PLAYABLE_SOURCE],
    }).session;

    if (!playlistSession) {
      throw new Error('Expected a playlist session.');
    }

    const summary = getMiniPlayerSummary({
      activePlayableItem: createTrackPlayableItem(PLAYABLE_SOURCE),
      activePlaylistSession: playlistSession,
      isPlaybackPreparing: false,
      playbackPositionSeconds: 18,
      playbackState: 'playing',
    });

    assert.equal(
      summary?.detail,
      'Warmups • Item 1 of 1 • Shuffle • Repeat all',
    );
  });

  it('builds now-playing copy with loop context and the next queue item', () => {
    const playlistSession = buildPlaylistPlaybackSession({
      loops: [SAVED_LOOP],
      mode: 'ordered',
      playlist: addLoopToPlaylist(
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
      ),
      repeatMode: 'all',
      sources: [PLAYABLE_SOURCE],
    }).session;

    if (!playlistSession) {
      throw new Error('Expected a playlist session.');
    }

    const summary = getNowPlayingSurfaceSummary({
      activePlayableItem: createLoopPlayableItem(SAVED_LOOP, PLAYABLE_SOURCE),
      activePlaylistSession: {
        ...playlistSession,
        currentIndex: 1,
      },
      isPlaybackPreparing: false,
      playbackPositionSeconds: 51,
      playbackState: 'playing',
    });

    assert.deepEqual(summary, {
      collectionLabel: 'Warmups • Item 2 of 2',
      playbackLabel:
        'Active session • Warmups • item 2 of 2 • Ordered • Repeat all.',
      progressLabel: '0:51 of 0:18',
      queueLabel: 'Ordered • Repeat all',
      rangeLabel: 'Loop 0:12 - 0:18',
      statusLabel: 'Playing',
      title: 'Entrance cue',
      upNextLabel: 'Alto Line.mp3',
    });
  });

  it('builds queue rows from the active playlist session', () => {
    const playlistSession = buildPlaylistPlaybackSession({
      loops: [SAVED_LOOP],
      mode: 'ordered',
      playlist: addLoopToPlaylist(
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
      ),
      repeatMode: 'all',
      sources: [PLAYABLE_SOURCE],
    }).session;

    if (!playlistSession) {
      throw new Error('Expected a playlist session.');
    }

    const summary = getUpNextSurfaceSummary({
      activePlaylistSession: {
        ...playlistSession,
        currentIndex: 1,
      },
    });

    assert.deepEqual(summary, {
      collectionLabel:
        'Warmups • Active session • Warmups • item 2 of 2 • Ordered • Repeat all.',
      items: [
        {
          detail: 'Full track • 3:05',
          isCurrent: false,
          key: 'entry:track:drive:alto-line:2026-05-12T00:01:00.000Z',
          title: 'Alto Line.mp3',
        },
        {
          detail: 'Loop 0:12 - 0:18 • Alto Line.mp3',
          isCurrent: true,
          key: 'entry:loop:loop-1:2026-05-12T00:02:00.000Z',
          title: 'Entrance cue',
        },
      ],
      queueLabel: 'Ordered • Repeat all',
    });
  });

  it('builds distinct queue row keys for repeated playlist items', () => {
    const playlistSession = buildPlaylistPlaybackSession({
      loops: [],
      mode: 'ordered',
      playlist: addTrackToPlaylist(
        addTrackToPlaylist(
          createPlaylist({
            createdAt: '2026-05-12T00:00:00.000Z',
            name: 'Repeats',
            ownerId: 'user-1',
          }),
          PLAYABLE_SOURCE,
          '2026-05-12T00:01:00.000Z',
        ),
        PLAYABLE_SOURCE,
        '2026-05-12T00:02:00.000Z',
      ),
      repeatMode: 'off',
      sources: [PLAYABLE_SOURCE],
    }).session;

    if (!playlistSession) {
      throw new Error('Expected a playlist session.');
    }

    const summary = getUpNextSurfaceSummary({
      activePlaylistSession: playlistSession,
    });

    assert.deepEqual(
      summary?.items.map((item) => item.key),
      [
        'entry:track:drive:alto-line:2026-05-12T00:01:00.000Z',
        'entry:track:drive:alto-line:2026-05-12T00:02:00.000Z',
      ],
    );
  });
});

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
