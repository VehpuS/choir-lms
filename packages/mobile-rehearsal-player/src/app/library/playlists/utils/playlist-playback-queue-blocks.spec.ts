/// <reference types="node" />

import assert from 'node:assert/strict';
import { describe, it } from 'node:test';

import { createTrackPlayableItem } from '@org/audio-library-models';

import { PLAYABLE_SOURCE } from '../../../test-utils/library-test-fixtures.js';
import {
  createTransientPlaybackSessionFromItems,
  dedupePlayableItems,
  isTransientQueueSession,
} from './playlist-playback-queue-state.js';
import { buildWarmupsPlaybackSession } from './saved-playlist-test-fixtures.js';
import {
  queuePlayableItemsAsNext,
  queuePlayableItemsAsUpNext,
  queuePlayableItemsDuringPlayback,
} from './saved-playlist-playback-view-model.js';

describe('dedupePlayableItems', () => {
  it('keeps only the first occurrence of a track reachable through multiple matched paths', () => {
    const directTrackMatch = createTrackPlayableItem(PLAYABLE_SOURCE);
    const sameTrackViaFolderExpansion =
      createTrackPlayableItem(PLAYABLE_SOURCE);
    const otherTrack = {
      ...directTrackMatch,
      id: 'track:drive:other-track',
      sourceId: 'drive:other-track',
    };

    const result = dedupePlayableItems([
      directTrackMatch,
      otherTrack,
      sameTrackViaFolderExpansion,
    ]);

    assert.deepEqual(
      result.map((item) => item.id),
      [directTrackMatch.id, otherTrack.id],
    );
  });

  it('preserves the original relative order of the surviving items', () => {
    const trackA = {
      ...createTrackPlayableItem(PLAYABLE_SOURCE),
      id: 'track:a',
    };
    const trackB = {
      ...createTrackPlayableItem(PLAYABLE_SOURCE),
      id: 'track:b',
    };
    const trackC = {
      ...createTrackPlayableItem(PLAYABLE_SOURCE),
      id: 'track:c',
    };

    const result = dedupePlayableItems([trackC, trackA, trackB, trackA]);

    assert.deepEqual(
      result.map((item) => item.id),
      ['track:c', 'track:a', 'track:b'],
    );
  });

  it('returns an empty list unchanged', () => {
    assert.deepEqual(dedupePlayableItems([]), []);
  });

  it('does not mutate the input array', () => {
    const trackA = {
      ...createTrackPlayableItem(PLAYABLE_SOURCE),
      id: 'track:a',
    };
    const items = [trackA, trackA];

    dedupePlayableItems(items);

    assert.equal(items.length, 2);
  });
});

describe('createTransientPlaybackSessionFromItems', () => {
  it('seeds the queue with every resolved item in order, starting at index 0', () => {
    const trackA = {
      ...createTrackPlayableItem(PLAYABLE_SOURCE),
      id: 'track:a',
    };
    const trackB = {
      ...createTrackPlayableItem(PLAYABLE_SOURCE),
      id: 'track:b',
    };

    const session = createTransientPlaybackSessionFromItems({
      items: [trackA, trackB],
      repeatMode: 'off',
    });

    assert.equal(session.currentIndex, 0);
    assert.equal(session.hasCompleted, false);
    assert.equal(session.requestedItemCount, 2);
    assert.deepEqual(session.queue.items, [trackA, trackB]);
    assert.equal(session.queue.mode, 'ordered');
    assert.equal(session.queue.repeatMode, 'off');
  });

  it('is recognized as a transient queue session', () => {
    const session = createTransientPlaybackSessionFromItems({
      items: [{ ...createTrackPlayableItem(PLAYABLE_SOURCE), id: 'track:a' }],
      repeatMode: 'off',
    });

    assert.equal(isTransientQueueSession(session), true);
  });

  it('builds an empty-queue session when given no items', () => {
    const session = createTransientPlaybackSessionFromItems({
      items: [],
      repeatMode: 'off',
    });

    assert.deepEqual(session.queue.items, []);
    assert.equal(session.requestedItemCount, 0);
  });
});

describe('queued blocks', () => {
  const block = ['a', 'b', 'c'].map((name) => {
    return createTrackPlayableItem({
      ...PLAYABLE_SOURCE,
      id: `drive:${name}`,
      name: `${name}.mp3`,
    });
  });

  it('inserts a Play next block in order right after the current item', () => {
    const session = buildWarmupsPlaybackSession();
    const queued = queuePlayableItemsAsNext(session, block);

    assert.deepEqual(
      queued.queue.items.map(({ id }) => id),
      ['track:drive:alto-line', ...block.map(({ id }) => id), 'loop:loop-1'],
    );
    assert.equal(queued.currentIndex, session.currentIndex);
    assert.equal(queued.requestedItemCount, session.requestedItemCount + 3);
  });

  it('appends an Add to queue block in order at the end', () => {
    const session = buildWarmupsPlaybackSession();
    const queued = queuePlayableItemsAsUpNext(session, block);

    assert.deepEqual(
      queued.queue.items.map(({ id }) => id).slice(-3),
      block.map(({ id }) => id),
    );
    assert.equal(queued.queue.items.length, session.queue.items.length + 3);
  });

  it('promotes standalone playback into the transient queue for a block', () => {
    const active = createTrackPlayableItem(PLAYABLE_SOURCE);
    const queued = queuePlayableItemsDuringPlayback({
      activePlayableItem: active,
      playableItems: block,
      position: 'next',
      repeatMode: 'off',
      session: null,
    });

    assert.equal(queued?.playlistId, 'transient-queue');
    assert.deepEqual(
      queued?.queue.items.map(({ id }) => id),
      [active.id, ...block.map(({ id }) => id)],
    );
    assert.equal(queued?.requestedItemCount, 4);
  });

  it('returns null for a block when nothing is playing', () => {
    assert.equal(
      queuePlayableItemsDuringPlayback({
        activePlayableItem: null,
        playableItems: block,
        position: 'up-next',
        repeatMode: 'off',
        session: null,
      }),
      null,
    );
  });
});
