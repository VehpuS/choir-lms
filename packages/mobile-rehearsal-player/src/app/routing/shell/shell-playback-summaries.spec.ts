/// <reference types="node" />

import assert from 'node:assert/strict';
import { describe, it } from 'node:test';

import {
  addTrackToPlaylist,
  createLoopPlayableItem,
  createPlaylist,
  createTrackPlayableItem,
} from '@org/audio-library-models';

import { bindQueueToPlaylistPlaybackSession } from '../../library/playlists/utils/playlist-session-mode.js';
import {
  buildPlaylistPlaybackSession,
  queuePlayableItemDuringPlayback,
} from '../../library/playlists/utils/saved-playlist-playback-view-model.js';
import { buildWarmupsPlaybackSession } from '../../library/playlists/utils/saved-playlist-test-fixtures.js';
import {
  PLAYABLE_SOURCE,
  SAVED_LOOP,
} from '../../test-utils/library-test-fixtures.js';
import {
  getMiniPlayerSummary,
  getNowPlayingSurfaceSummary,
  getUpNextSurfaceSummary,
} from './shell-model.js';

describe('shell playback summaries', () => {
  it('keeps loop mini-player copy compact without losing accessible context', () => {
    const playableLoop = createLoopPlayableItem(SAVED_LOOP, PLAYABLE_SOURCE);
    const customNameSummary = getMiniPlayerSummary({
      activePlayableItem: playableLoop,
      isPlaybackPreparing: false,
      playbackPositionSeconds: 15,
      playbackState: 'playing',
    });

    assert.equal(
      customNameSummary?.context,
      'Playing • Loop from Alto Line.mp3',
    );
    assert.equal(
      customNameSummary?.accessibilityLabel,
      'Now playing: Entrance cue. Playing • 0:03 of 0:06 • Saved loop from Alto Line.mp3 • Single item playback • Loop 0:12 - 0:18',
    );
    const autoNameSummary = getMiniPlayerSummary({
      activePlayableItem: {
        ...playableLoop,
        title: `Loop 0:12 - 0:18 • ${PLAYABLE_SOURCE.name}`,
      },
      isPlaybackPreparing: false,
      playbackPositionSeconds: 15,
      playbackState: 'playing',
    });

    assert.equal(autoNameSummary?.context, 'Playing • Saved loop');
    assert.match(
      autoNameSummary?.accessibilityLabel ?? '',
      /Saved loop from Alto Line\.mp3/,
    );
  });

  it('builds now-playing copy with loop context and the next queue item', () => {
    const summary = getNowPlayingSurfaceSummary({
      activePlayableItem: createLoopPlayableItem(SAVED_LOOP, PLAYABLE_SOURCE),
      activePlaylistSession: {
        ...buildWarmupsPlaybackSession({
          repeatMode: 'all',
          sources: [PLAYABLE_SOURCE],
        }),
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

    assert.equal(
      getMiniPlayerSummary({
        activePlayableItem,
        activePlaylistSession: transientSession,
        isPlaybackPreparing: false,
        playbackPositionSeconds: 18,
        playbackState: 'playing',
      })?.context,
      'Playing • Current queue • 1 of 2',
    );
    assert.deepEqual(
      getNowPlayingSurfaceSummary({
        activePlayableItem,
        activePlaylistSession: transientSession,
        isPlaybackPreparing: false,
        playbackPositionSeconds: 18,
        playbackState: 'playing',
      }),
      {
        collectionLabel: 'Current queue • Item 1 of 2',
        playbackLabel:
          'Active session • Current queue • item 1 of 2 • Ordered • Repeat all.',
        progressLabel: '0:18 of 3:05',
        rangeLabel: null,
        statusLabel: 'Playing',
        supportsQueueNavigation: true,
        title: 'Alto Line.mp3',
        upNextLabel: 'Tenor Line.mp3',
        waveformProgressRatio: 18 / 185,
      },
    );
    assert.deepEqual(
      getUpNextSurfaceSummary({
        activePlaylistSession: transientSession,
      }),
      {
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
        queuePlaylistActions: {
          saveLabel: 'Create new playlist',
          updateAction: null,
        },
      },
    );
  });

  it('builds queue rows from the active playlist session', () => {
    const summary = getUpNextSurfaceSummary({
      activePlaylistSession: {
        ...buildWarmupsPlaybackSession({
          repeatMode: 'all',
          sources: [PLAYABLE_SOURCE],
        }),
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
      queuePlaylistActions: {
        saveLabel: 'Create new playlist',
        updateAction: {
          confirmLabel: 'Update playlist',
          confirmationMessage:
            'Replace the saved items and order in Warmups with the current Up Next order. Unsaved queued tracks will be added to Library first, and current playback keeps running.',
          confirmationTitle: 'Update Warmups?',
          label: 'Update current playlist',
        },
      },
    });
  });

  it('shows update current playlist after saving a transient queue as a new playlist', () => {
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
      repeatMode: 'off',
      session: null,
    });

    if (!transientSession) {
      throw new Error('Expected a transient queue session.');
    }

    const savedPlaylist = addTrackToPlaylist(
      addTrackToPlaylist(
        createPlaylist({
          createdAt: '2026-06-14T20:48:00.000Z',
          name: 'Wednesday rehearsal',
          ownerId: 'user-1',
        }),
        PLAYABLE_SOURCE,
        '2026-06-14T20:49:00.000Z',
      ),
      {
        ...PLAYABLE_SOURCE,
        id: 'drive:tenor-line',
        name: 'Tenor Line.mp3',
      },
      '2026-06-14T20:50:00.000Z',
    );
    const reboundSession = bindQueueToPlaylistPlaybackSession({
      playlist: savedPlaylist,
      session: transientSession,
    });

    assert.deepEqual(
      getUpNextSurfaceSummary({
        activePlaylistSession: reboundSession,
      })?.queuePlaylistActions,
      {
        saveLabel: 'Create new playlist',
        updateAction: {
          confirmLabel: 'Update playlist',
          confirmationMessage:
            'Replace the saved items and order in Wednesday rehearsal with the current Up Next order. Unsaved queued tracks will be added to Library first, and current playback keeps running.',
          confirmationTitle: 'Update Wednesday rehearsal?',
          label: 'Update current playlist',
        },
      },
    );
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
