/// <reference types="node" />

import assert from 'node:assert/strict';
import { describe, it } from 'node:test';

import {
  addTrackToPlaylist,
  createPlaylist,
  createTrackPlayableItem,
} from '@org/audio-library-models';

import { bindQueueToPlaylistPlaybackSession } from '../../library/playlists/utils/playlist-session-mode.js';
import {
  buildPlaylistPlaybackSession,
  queuePlayableItemDuringPlayback,
} from '../../library/playlists/utils/saved-playlist-playback-view-model.js';
import { buildWarmupsPlaybackSession } from '../../library/playlists/utils/saved-playlist-test-fixtures.js';
import { PLAYABLE_SOURCE } from '../../test-utils/library-test-fixtures.js';
import {
  getMiniPlayerSummary,
  getNowPlayingSurfaceSummary,
  getUpNextSurfaceSummary,
} from './shell-model.js';

describe('shell queue summaries', () => {
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
      'Playing · Current queue · 1 of 2',
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
        collectionLabel: 'Current queue · 1 of 2',
        playbackLabel:
          'Active session • Current queue • item 1 of 2 • Ordered • Repeat all.',
        progressLabel: '0:18 of 3:05',
        loopRange: null,
        shapingLabel: null,
        statusLabel: 'Playing',
        supportsQueueNavigation: true,
        title: 'Alto Line.mp3',
        waveformProgressRatio: 18 / 185,
      },
    );
    assert.deepEqual(
      getUpNextSurfaceSummary({
        activePlaylistSession: transientSession,
      }),
      {
        items: [
          {
            detail: 'Track · 3:05',
            isCurrent: true,
            itemRef: { kind: 'track', sourceId: 'drive:alto-line' },
            key: 'track:drive:alto-line:0',
            title: 'Alto Line.mp3',
          },
          {
            detail: 'Track · 3:05',
            isCurrent: false,
            itemRef: { kind: 'track', sourceId: 'drive:tenor-line' },
            key: 'track:drive:tenor-line:1',
            title: 'Tenor Line.mp3',
          },
        ],
        metaLabel: '2 items · 6:10 · ordered · repeat all',
        queuePlaylistActions: {
          saveLabel: 'Save as playlist',
          updateAction: null,
        },
        title: 'Current queue',
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
      items: [
        {
          detail: 'Track · 3:05',
          isCurrent: false,
          itemRef: { kind: 'track', sourceId: 'drive:alto-line' },
          key: 'entry:track:drive:alto-line:2026-05-12T00:01:00.000Z',
          title: 'Alto Line.mp3',
        },
        {
          detail: 'Loop · 0:12–0:18 · Alto Line.mp3',
          isCurrent: true,
          itemRef: {
            kind: 'loop',
            loopId: 'loop-1',
            sourceId: 'drive:alto-line',
          },
          key: 'entry:loop:loop-1:2026-05-12T00:02:00.000Z',
          title: 'Entrance cue',
        },
      ],
      metaLabel: '2 items · 3:11 · ordered · repeat all',
      queuePlaylistActions: {
        saveLabel: 'Save as new',
        updateAction: {
          confirmLabel: 'Update playlist',
          confirmationMessage:
            'Replace the saved items and order in Warmups with the current queue order. Unsaved queued tracks will be added to your library first, and current playback keeps running.',
          confirmationTitle: 'Update Warmups?',
          label: 'Update Warmups',
        },
      },
      title: 'Warmups',
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
        saveLabel: 'Save as new',
        updateAction: {
          confirmLabel: 'Update playlist',
          confirmationMessage:
            'Replace the saved items and order in Wednesday rehearsal with the current queue order. Unsaved queued tracks will be added to your library first, and current playback keeps running.',
          confirmationTitle: 'Update Wednesday rehearsal?',
          label: 'Update Wednesday rehearsal',
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
