import assert from 'node:assert/strict';
import { describe, it } from 'node:test';

import {
  PLAYABLE_SOURCE,
  SAVED_LOOP,
} from '../../test-utils/library-test-fixtures.js';
import { resolvePlaybackRefsToPlayableItems } from './playback-items.js';

const collections = { loops: [SAVED_LOOP], sources: [PLAYABLE_SOURCE] };

describe('resolvePlaybackRefsToPlayableItems', () => {
  it('keeps the refs order and builds track and loop items', () => {
    const { playableItems, unavailableCount } =
      resolvePlaybackRefsToPlayableItems(
        [
          { entityId: SAVED_LOOP.id, kind: 'loop' },
          { entityId: PLAYABLE_SOURCE.id, kind: 'track' },
          { entityId: PLAYABLE_SOURCE.id, kind: 'track' },
        ],
        collections,
      );

    assert.deepEqual(
      playableItems.map(({ kind }) => kind),
      ['loop', 'track', 'track'],
    );
    assert.equal(unavailableCount, 0);
  });

  it('counts refs whose track, loop or source is gone or cannot play', () => {
    const unplayable = {
      ...PLAYABLE_SOURCE,
      availability: { reason: 'unsupported-format', status: 'unavailable' },
      id: 'drive:bad',
    } as unknown as typeof PLAYABLE_SOURCE;
    const { playableItems, unavailableCount } =
      resolvePlaybackRefsToPlayableItems(
        [
          { entityId: 'drive:missing', kind: 'track' },
          { entityId: 'loop-missing', kind: 'loop' },
          { entityId: 'drive:bad', kind: 'track' },
          { entityId: PLAYABLE_SOURCE.id, kind: 'track' },
        ],
        { loops: [SAVED_LOOP], sources: [PLAYABLE_SOURCE, unplayable] },
      );

    assert.equal(playableItems.length, 1);
    assert.equal(unavailableCount, 3);
  });
});
