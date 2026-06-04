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
import { buildPlaylistPlaybackSession } from '../../library/utils/saved-playlist-playback-view-model.js';
import {
  SHELL_DESTINATIONS,
  getPlaybackProgressRatio,
  getMiniPlayerSummary,
  getNowPlayingSurfaceSummary,
  getUpNextSurfaceSummary,
} from '../shell-model.js';
import { resolveVisibleRepeatModes } from '../playback-session-mode-options.js';
import { shouldStartPlaybackSurfaceDismissGesture } from '../playback-surface-gestures.js';
import { getQueueListMaxHeight } from '../queue-surface-layout.js';
import { queuePlayableItemDuringPlayback } from '../../library/utils/saved-playlist-playback-view-model.js';

describe('SHELL_DESTINATIONS', () => {
  it('defines the Library, Add, and Recents shell order', () => {
    assert.deepEqual(
      SHELL_DESTINATIONS.map((destination) => destination.label),
      ['Library', 'Add', 'Recents'],
    );
  });
});

describe('getMiniPlayerSummary', () => {
  it('shows only single-item repeat controls when playback is standalone', () => {
    assert.deepEqual(resolveVisibleRepeatModes(false), ['off', 'one']);
  });

  it('shows full repeat controls when queued playback is active', () => {
    assert.deepEqual(resolveVisibleRepeatModes(true), ['off', 'one', 'all']);
  });

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
      waveformProgressRatio: 18 / 185,
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

  it('shows needs-attention status when playback reports an error', () => {
    const summary = getMiniPlayerSummary({
      activePlayableItem: createTrackPlayableItem(PLAYABLE_SOURCE),
      isPlaybackPreparing: false,
      playbackPositionSeconds: 4,
      playbackState: 'error',
    });

    assert.equal(summary?.status, 'Needs attention • 0:04 of 3:05');
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
      progressLabel: '0:06 of 0:06',
      queueLabel: 'Ordered • Repeat all',
      queuePlaylistActions: {
        saveLabel: 'Create new playlist',
        updateLabel: 'Update playlist',
      },
      rangeLabel: 'Loop 0:12 - 0:18',
      statusLabel: 'Playing',
      supportsQueueNavigation: true,
      title: 'Entrance cue',
      upNextLabel: 'Alto Line.mp3',
      waveformProgressRatio: 1,
    });
  });

  it('builds standalone now-playing copy without queue navigation', () => {
    const summary = getNowPlayingSurfaceSummary({
      activePlayableItem: createTrackPlayableItem(PLAYABLE_SOURCE),
      isPlaybackPreparing: false,
      playbackPositionSeconds: 20,
      playbackState: 'paused',
    });

    assert.deepEqual(summary, {
      collectionLabel: 'Saved rehearsal library',
      playbackLabel:
        'Keep the current rehearsal item audible while moving between Library, Add, and Recents.',
      progressLabel: '0:20 of 3:05',
      queueLabel: 'Single item playback',
      queuePlaylistActions: null,
      rangeLabel: null,
      statusLabel: 'Paused',
      supportsQueueNavigation: false,
      title: 'Alto Line.mp3',
      upNextLabel: null,
      waveformProgressRatio: 20 / 185,
    });
  });

  it('surfaces transient queue affordances once standalone playback is promoted', () => {
    const activePlayableItem = createTrackPlayableItem(PLAYABLE_SOURCE);
    const queuedPlayableItem = createTrackPlayableItem({
      ...PLAYABLE_SOURCE,
      id: 'drive:tenor-line',
      name: 'Tenor Line.mp3',
    });
    const transientSession = queuePlayableItemDuringPlayback({
      activePlayableItem,
      playableItem: queuedPlayableItem,
      position: 'next',
      repeatMode: 'all',
      session: null,
    });

    if (!transientSession) {
      throw new Error('Expected a transient queue session.');
    }

    const miniPlayerSummary = getMiniPlayerSummary({
      activePlayableItem,
      activePlaylistSession: transientSession,
      isPlaybackPreparing: false,
      playbackPositionSeconds: 18,
      playbackState: 'playing',
    });
    const nowPlayingSummary = getNowPlayingSurfaceSummary({
      activePlayableItem,
      activePlaylistSession: transientSession,
      isPlaybackPreparing: false,
      playbackPositionSeconds: 18,
      playbackState: 'playing',
    });
    const upNextSummary = getUpNextSurfaceSummary({
      activePlaylistSession: transientSession,
    });

    assert.equal(
      miniPlayerSummary?.detail,
      'Current queue • Item 1 of 2 • Ordered • Repeat all',
    );
    assert.deepEqual(nowPlayingSummary, {
      collectionLabel: 'Current queue • Item 1 of 2',
      playbackLabel:
        'Active session • Current queue • item 1 of 2 • Ordered • Repeat all.',
      progressLabel: '0:18 of 3:05',
      queueLabel: 'Ordered • Repeat all',
      queuePlaylistActions: {
        saveLabel: 'Create new playlist',
        updateLabel: 'Update playlist',
      },
      rangeLabel: null,
      statusLabel: 'Playing',
      supportsQueueNavigation: true,
      title: 'Alto Line.mp3',
      upNextLabel: 'Tenor Line.mp3',
      waveformProgressRatio: 18 / 185,
    });
    assert.deepEqual(upNextSummary, {
      collectionLabel:
        'Current queue • Active session • Current queue • item 1 of 2 • Ordered • Repeat all.',
      items: [
        {
          detail: 'Full track • 3:05',
          isCurrent: true,
          key: 'track:drive:alto-line:0',
          title: 'Alto Line.mp3',
        },
        {
          detail: 'Full track • 3:05',
          isCurrent: false,
          key: 'track:drive:tenor-line:1',
          title: 'Tenor Line.mp3',
        },
      ],
      queueLabel: 'Ordered • Repeat all',
    });
  });

  it('clamps waveform progress within the active playable range', () => {
    assert.equal(
      getPlaybackProgressRatio({
        activePlayableItem: createTrackPlayableItem(PLAYABLE_SOURCE),
        playbackPositionSeconds: 400,
      }),
      1,
    );
    assert.equal(
      getPlaybackProgressRatio({
        activePlayableItem: createLoopPlayableItem(SAVED_LOOP, PLAYABLE_SOURCE),
        playbackPositionSeconds: 3,
      }),
      0,
    );
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

describe('getQueueListMaxHeight', () => {
  it('keeps the queue list tall enough on compact screens', () => {
    assert.equal(getQueueListMaxHeight(480), 220);
  });

  it('caps the queue list height on taller screens', () => {
    assert.equal(getQueueListMaxHeight(1200), 320);
  });

  it('falls back to the minimum height when window size is invalid', () => {
    assert.equal(getQueueListMaxHeight(Number.NaN), 220);
  });
});

describe('shouldStartPlaybackSurfaceDismissGesture', () => {
  it('starts a dismiss gesture when a downward drag begins near the handle', () => {
    assert.equal(
      shouldStartPlaybackSurfaceDismissGesture({
        dx: 2,
        dy: 18,
        locationY: 48,
      }),
      true,
    );
  });

  it('ignores downward drags that begin inside scrollable sheet content', () => {
    assert.equal(
      shouldStartPlaybackSurfaceDismissGesture({
        dx: 1,
        dy: 24,
        locationY: 220,
      }),
      false,
    );
  });

  it('ignores gestures that are mostly horizontal', () => {
    assert.equal(
      shouldStartPlaybackSurfaceDismissGesture({
        dx: 22,
        dy: 10,
        locationY: 40,
      }),
      false,
    );
  });
});
