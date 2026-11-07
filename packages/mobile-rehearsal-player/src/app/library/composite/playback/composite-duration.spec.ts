import assert from 'node:assert/strict';
import { describe, it } from 'node:test';

import { createCompositePlayableItem } from '@org/audio-library-models';

import { resolveSavedTrackDuration } from '../../playback/utils/saved-track-duration-resolution';

const composite = {
  id: 'c1',
  name: 'Ubi caritas',
  createdAt: 'now',
  stems: [
    { id: 's1', trackId: 't1', name: 'S', offsetMs: 0, mine: false },
    { id: 's2', trackId: 't2', name: 'B', offsetMs: 0, mine: false },
  ],
};
const unusedOptions = {
  accessToken: null,
  activePlayableItem: null,
} as unknown as Parameters<typeof resolveSavedTrackDuration>[1];

describe('composite duration resolution', () => {
  it('uses the length from the stems without probing the player, even with no token', async () => {
    const item = createCompositePlayableItem(composite, {
      durationMs: 187_500,
    });

    assert.equal(await resolveSavedTrackDuration(item, unusedOptions), 187_500);
  });

  it('is unknown, not probed, while a stem duration is unknown', async () => {
    const item = createCompositePlayableItem(composite);

    assert.equal(await resolveSavedTrackDuration(item, unusedOptions), null);
  });
});
