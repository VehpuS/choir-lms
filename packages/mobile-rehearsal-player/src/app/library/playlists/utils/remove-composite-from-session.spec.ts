import assert from 'node:assert/strict';
import { describe, it } from 'node:test';

import {
  createCompositePlayableItem,
  createTrackPlayableItem,
  type CompositeTrack,
} from '@org/audio-library-models';

import { PLAYABLE_SOURCE } from '../../../test-utils/library-test-fixtures.js';
import { removeCompositeFromPlaybackSession } from './playlist-playback-queue-state';
import { buildThreeItemQueueSession } from './saved-playlist-test-fixtures.js';

const COMPOSITE: CompositeTrack = {
  createdAt: '2026-05-10T10:00:00.000Z',
  defaultMix: { levels: {} },
  id: 'composite-1',
  name: 'Seeded SATB',
  presets: [],
  stems: [],
};

// A queue of a track, the composite and the track again, with `currentIndex`.
const buildSession = (currentIndex: number) => {
  const base = buildThreeItemQueueSession();

  return {
    ...base,
    currentIndex,
    queue: {
      ...base.queue,
      items: [
        createTrackPlayableItem(PLAYABLE_SOURCE),
        createCompositePlayableItem(COMPOSITE),
        createTrackPlayableItem(PLAYABLE_SOURCE),
      ],
    },
    requestedItemCount: 3,
  };
};

describe('removeCompositeFromPlaybackSession', () => {
  it('ends the session when the deleted composite is the current item', () => {
    assert.equal(
      removeCompositeFromPlaybackSession(buildSession(1), COMPOSITE.id),
      null,
    );
  });

  it('drops a queued composite and keeps the current item current', () => {
    const next = removeCompositeFromPlaybackSession(
      buildSession(2),
      COMPOSITE.id,
    );

    assert.equal(next?.queue.items.length, 2);
    assert.equal(next?.currentIndex, 1);
    assert.equal(next?.requestedItemCount, 2);
  });

  it('leaves the session alone when the composite is not in it', () => {
    const session = buildSession(0);

    assert.equal(removeCompositeFromPlaybackSession(session, 'other'), session);
    assert.equal(removeCompositeFromPlaybackSession(null, COMPOSITE.id), null);
  });
});
