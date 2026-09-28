/// <reference types="node" />

import assert from 'node:assert/strict';
import { describe, it } from 'node:test';

import { createTrackPlayableItem } from '@org/audio-library-models';

import { PLAYABLE_SOURCE } from '../../../test-utils/library-test-fixtures.js';
import { createTransientPlaybackSessionFromItems } from './playlist-playback-queue-state.js';
import { rebuildQueueSessionForMode } from './queue-session-mode.js';
import {
  buildWarmupsPlaybackSession,
  buildWarmupsQueuePlaylist,
} from './saved-playlist-test-fixtures.js';

// Always picking index 0 makes the Fisher-Yates shuffle deterministic:
// [b, c, d] becomes [c, d, b].
const pickFirst = () => 0;

const buildTrack = (name: string) => {
  return createTrackPlayableItem({
    ...PLAYABLE_SOURCE,
    id: `drive:${name}`,
    name: `${name}.mp3`,
  });
};

const buildQueue = (names: string[], currentIndex: number) => {
  return {
    ...createTransientPlaybackSessionFromItems({
      items: names.map(buildTrack),
      repeatMode: 'off',
    }),
    currentIndex,
  };
};

const queueIds = (session: { queue: { items: { id: string }[] } }) => {
  return session.queue.items.map((item) => item.id);
};

describe('queue session mode', () => {
  it('shuffles only the items after the playing one and marks the queue as shuffled', () => {
    const session = buildQueue(['a', 'b', 'c', 'd'], 0);

    const shuffled = rebuildQueueSessionForMode({
      mode: 'shuffle',
      random: pickFirst,
      session,
    });

    assert.equal(shuffled.queue.mode, 'shuffle');
    assert.equal(shuffled.currentIndex, 0);
    assert.deepEqual(queueIds(shuffled), [
      'track:drive:a',
      'track:drive:c',
      'track:drive:d',
      'track:drive:b',
    ]);
  });

  it('keeps already-played items in place when shuffling mid-queue', () => {
    const session = buildQueue(['a', 'b', 'c', 'd', 'e'], 1);

    const shuffled = rebuildQueueSessionForMode({
      mode: 'shuffle',
      random: pickFirst,
      session,
    });

    assert.equal(shuffled.currentIndex, 1);
    assert.deepEqual(queueIds(shuffled).slice(0, 2), [
      'track:drive:a',
      'track:drive:b',
    ]);
  });

  it('restores the pre-shuffle order and follows the playing item when shuffle is turned off', () => {
    const session = buildQueue(['a', 'b', 'c', 'd'], 0);
    const shuffled = rebuildQueueSessionForMode({
      mode: 'shuffle',
      random: pickFirst,
      session,
    });
    // Advance to the second shuffled item (c) before turning shuffle off.
    const advanced = { ...shuffled, currentIndex: 1 };

    const ordered = rebuildQueueSessionForMode({
      mode: 'ordered',
      session: advanced,
    });

    assert.equal(ordered.queue.mode, 'ordered');
    assert.deepEqual(queueIds(ordered), queueIds(session));
    assert.equal(
      ordered.queue.items[ordered.currentIndex]?.id,
      'track:drive:c',
    );
    assert.equal(ordered.unshuffledItems, undefined);
  });

  it('keeps queue edits made while shuffled when restoring order', () => {
    const shuffled = rebuildQueueSessionForMode({
      mode: 'shuffle',
      random: pickFirst,
      session: buildQueue(['a', 'b', 'c'], 0),
    });
    const edited = {
      ...shuffled,
      queue: {
        ...shuffled.queue,
        items: [
          ...shuffled.queue.items.filter((item) => item.id !== 'track:drive:b'),
          buildTrack('added'),
        ],
      },
    };

    const ordered = rebuildQueueSessionForMode({
      mode: 'ordered',
      session: edited,
    });

    assert.deepEqual(queueIds(ordered), [
      'track:drive:a',
      'track:drive:c',
      'track:drive:added',
    ]);
  });

  it('leaves the session untouched when it is already in the requested mode', () => {
    const session = buildQueue(['a', 'b'], 0);

    assert.equal(
      rebuildQueueSessionForMode({ mode: 'ordered', session }),
      session,
    );
  });

  it('restores playlist order when shuffle is turned off for a playlist started shuffled', () => {
    const orderedPlaylistSession = buildWarmupsPlaybackSession({
      playlist: buildWarmupsQueuePlaylist(),
    });
    const shuffledPlaylistSession = buildWarmupsPlaybackSession({
      mode: 'shuffle',
      playlist: buildWarmupsQueuePlaylist(),
    });
    const currentId =
      shuffledPlaylistSession.queue.items[shuffledPlaylistSession.currentIndex]
        ?.id;

    const ordered = rebuildQueueSessionForMode({
      mode: 'ordered',
      session: shuffledPlaylistSession,
    });

    assert.equal(ordered.queue.mode, 'ordered');
    assert.deepEqual(queueIds(ordered), queueIds(orderedPlaylistSession));
    assert.equal(ordered.queue.items[ordered.currentIndex]?.id, currentId);
    assert.equal(ordered.playlistId, orderedPlaylistSession.playlistId);
  });

  it('round-trips a playlist session through shuffle without losing its playlist entries', () => {
    const session = buildWarmupsPlaybackSession({
      playlist: buildWarmupsQueuePlaylist(),
    });

    const roundTripped = rebuildQueueSessionForMode({
      mode: 'ordered',
      session: rebuildQueueSessionForMode({
        mode: 'shuffle',
        random: pickFirst,
        session,
      }),
    });

    assert.deepEqual(roundTripped.queue.items, session.queue.items);
    assert.equal(roundTripped.currentIndex, session.currentIndex);
  });
});
