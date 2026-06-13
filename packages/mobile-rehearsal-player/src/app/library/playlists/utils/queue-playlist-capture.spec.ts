/// <reference types="node" />

import assert from 'node:assert/strict';
import { describe, it } from 'node:test';

import {
  addTrackToPlaylist,
  createLoopPlayableItem,
  createPlaylist,
  createTrackPlayableItem,
} from '@org/audio-library-models';

import {
  PLAYABLE_SOURCE,
  SAVED_LOOP,
} from '../../../test-utils/library-test-fixtures.js';
import {
  appendQueueItemsToPlaylist,
  buildSavedPlaylistFromQueue,
} from './queue-playlist-capture.js';
import { queuePlayableItemDuringPlayback } from './saved-playlist-playback-view-model.js';

describe('queue playlist capture', () => {
  it('captures queue items into a playlist and deduplicates unsaved repeated tracks', () => {
    const activePlayableItem = createTrackPlayableItem(PLAYABLE_SOURCE);
    const transientSession = queuePlayableItemDuringPlayback({
      activePlayableItem,
      playableItem: activePlayableItem,
      position: 'up-next',
      repeatMode: 'off',
      session: null,
    });

    const captureResult = buildSavedPlaylistFromQueue({
      name: 'Warmup queue',
      now: '2026-06-04T10:00:00.000Z',
      ownerId: 'user-1',
      savedLoops: [],
      savedSources: [],
      session: transientSession,
    });

    assert.equal(captureResult.issue, null);
    assert.equal(captureResult.playlist?.items.length, 2);
    assert.equal(captureResult.playlist?.items[0]?.title, 'Alto Line.mp3');
    assert.equal(captureResult.playlist?.items[1]?.title, 'Alto Line.mp3');
    assert.notEqual(
      captureResult.playlist?.items[0]?.id,
      captureResult.playlist?.items[1]?.id,
    );
    assert.deepEqual(
      captureResult.unsavedSources.map((source) => source.id),
      [PLAYABLE_SOURCE.id],
    );
  });

  it('appends queue items to an existing playlist in queue order', () => {
    const activePlayableItem = createTrackPlayableItem(PLAYABLE_SOURCE);
    const transientSession = queuePlayableItemDuringPlayback({
      activePlayableItem,
      playableItem: activePlayableItem,
      position: 'up-next',
      repeatMode: 'off',
      session: null,
    });
    const existingPlaylist = addTrackToPlaylist(
      createPlaylist({
        createdAt: '2026-06-04T09:00:00.000Z',
        name: 'Sunday set',
        ownerId: 'user-1',
      }),
      {
        ...PLAYABLE_SOURCE,
        id: 'drive:bass-line',
        name: 'Bass Line.mp3',
      },
      '2026-06-04T09:05:00.000Z',
    );

    const captureResult = appendQueueItemsToPlaylist({
      now: '2026-06-04T10:00:00.000Z',
      playlist: existingPlaylist,
      savedLoops: [],
      savedSources: [],
      session: transientSession,
    });

    assert.equal(captureResult.issue, null);
    assert.deepEqual(
      captureResult.playlist?.items.map((entry) => entry.title),
      ['Bass Line.mp3', 'Alto Line.mp3', 'Alto Line.mp3'],
    );
    assert.deepEqual(
      captureResult.unsavedSources.map((source) => source.id),
      [PLAYABLE_SOURCE.id],
    );
    assert.notEqual(
      captureResult.playlist?.items[1]?.id,
      captureResult.playlist?.items[2]?.id,
    );
  });

  it('reports an issue when queued loop items cannot be resolved during queue capture', () => {
    const transientSession = queuePlayableItemDuringPlayback({
      activePlayableItem: createTrackPlayableItem(PLAYABLE_SOURCE),
      playableItem: createLoopPlayableItem(SAVED_LOOP, PLAYABLE_SOURCE),
      position: 'next',
      repeatMode: 'off',
      session: null,
    });

    const captureResult = buildSavedPlaylistFromQueue({
      name: 'Warmup queue',
      now: '2026-06-04T10:00:00.000Z',
      ownerId: 'user-1',
      savedLoops: [],
      savedSources: [PLAYABLE_SOURCE],
      session: transientSession,
    });

    assert.deepEqual(captureResult, {
      issue: {
        title: 'Queued loop unavailable',
        message:
          'The queue item "Entrance cue" no longer has a saved loop source. Remove it from Up Next before saving this playlist.',
      },
      playlist: null,
      unsavedSources: [],
    });
  });
});
