/// <reference types="node" />

import assert from 'node:assert/strict';
import { describe, it } from 'node:test';

import { buildPlaylistPlaybackSession } from '../../playlists/utils/saved-playlist-playback-view-model.js';
import {
  PLAYABLE_SOURCE,
  SAVED_LOOP,
} from '../../../test-utils/library-test-fixtures.js';
import {
  buildTrackScopedLoopPlaybackPlaylist,
  getTrackScopedLoopDetailCopy,
} from './track-scoped-loop-view-model.js';

describe('track scoped loop view-model', () => {
  it('builds a stable track-scoped loop playback playlist and detail copy', () => {
    const secondLoop = {
      ...SAVED_LOOP,
      id: 'loop-2',
      name: 'Cadence repeat',
      startMs: 30000,
      endMs: 47000,
      createdAt: '2026-05-10T01:00:00.000Z',
      updatedAt: '2026-05-10T01:05:00.000Z',
    };
    const playlist = buildTrackScopedLoopPlaybackPlaylist({
      loops: [SAVED_LOOP, secondLoop],
      source: PLAYABLE_SOURCE,
    });

    assert.deepEqual(
      getTrackScopedLoopDetailCopy({
        loopCount: 2,
        sourceName: PLAYABLE_SOURCE.name,
      }),
      {
        body: "Play this track's saved loops in order, start from any loop row, or capture a new loop from Alto Line.mp3.",
        emptyMessage:
          'No saved loops for Alto Line.mp3 yet. Make new loop to capture the first practice segment.',
        metadataLabel: '2 saved loops • Parent track',
        title: 'Alto Line.mp3 loops',
      },
    );

    assert.deepEqual(playlist, {
      id: 'playlist:track-loops:drive:alto-line',
      name: 'Alto Line.mp3 loops',
      items: [
        {
          id: 'entry:loop:loop-1:2026-05-10T00:00:00.000Z',
          playlistId: 'playlist:track-loops:drive:alto-line',
          sortIndex: 0,
          kind: 'loop',
          sourceId: 'drive:alto-line',
          loopId: 'loop-1',
          title: 'Entrance cue',
          description: 'Alto Line.mp3 loop',
          createdAt: '2026-05-10T00:00:00.000Z',
        },
        {
          id: 'entry:loop:loop-2:2026-05-10T01:00:00.000Z',
          playlistId: 'playlist:track-loops:drive:alto-line',
          sortIndex: 1,
          kind: 'loop',
          sourceId: 'drive:alto-line',
          loopId: 'loop-2',
          title: 'Cadence repeat',
          description: 'Alto Line.mp3 loop',
          createdAt: '2026-05-10T01:00:00.000Z',
        },
      ],
      ownershipScope: 'user',
      ownerId: 'drive:alto-line',
      createdAt: '2026-05-10T00:00:00.000Z',
      updatedAt: '2026-05-10T01:05:00.000Z',
    });

    const playbackSession = buildPlaylistPlaybackSession({
      loops: [SAVED_LOOP, secondLoop],
      mode: 'ordered',
      playlist,
      repeatMode: 'off',
      sources: [PLAYABLE_SOURCE],
      startEntryId: playlist.items[1]?.id,
    });

    assert.equal(playbackSession.issue, null);
    assert.equal(playbackSession.session?.currentIndex, 1);
    assert.deepEqual(
      playbackSession.session?.queue.items.map((item) => ({
        id: item.id,
        loopId: item.loopId,
        playlistEntryId: item.playlistEntryId,
      })),
      [
        {
          id: 'loop:loop-1',
          loopId: 'loop-1',
          playlistEntryId: 'entry:loop:loop-1:2026-05-10T00:00:00.000Z',
        },
        {
          id: 'loop:loop-2',
          loopId: 'loop-2',
          playlistEntryId: 'entry:loop:loop-2:2026-05-10T01:00:00.000Z',
        },
      ],
    );
  });
});
