/// <reference types="node" />

import { createTrackPlayableItem } from '@org/audio-library-models';
import assert from 'node:assert/strict';
import { describe, it } from 'node:test';

import { PLAYABLE_SOURCE } from '../../../test-utils/library-test-fixtures.js';
import { resolveNowPlayingMakeLoopRequest } from './now-playing-menu-model.js';

describe('now playing menu model', () => {
  it('starts a new loop on the active track at the playhead', () => {
    assert.deepEqual(
      resolveNowPlayingMakeLoopRequest({
        activePlayableItem: createTrackPlayableItem(PLAYABLE_SOURCE),
        playbackPositionSeconds: 12.34,
      }),
      { sourceId: PLAYABLE_SOURCE.id, startMs: 12340 },
    );
  });

  it('offers nothing for a track whose source is unavailable', () => {
    assert.equal(
      resolveNowPlayingMakeLoopRequest({
        activePlayableItem: createTrackPlayableItem({
          ...PLAYABLE_SOURCE,
          availability: { reason: 'missing', status: 'unavailable' },
        } as typeof PLAYABLE_SOURCE),
        playbackPositionSeconds: 3,
      }),
      null,
    );
  });
});
