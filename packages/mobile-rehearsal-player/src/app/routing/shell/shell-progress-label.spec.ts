import assert from 'node:assert/strict';
import { describe, it } from 'node:test';

import { createTrackPlayableItem } from '@org/audio-library-models';

import { PLAYABLE_SOURCE } from '../../test-utils/library-test-fixtures.js';
import { getProgressLabel } from './shell-playback-summary-model.js';

describe('getProgressLabel', () => {
  it('reports position and length in whole seconds for an ordinary track', () => {
    assert.equal(
      getProgressLabel({
        activePlayableItem: createTrackPlayableItem({
          ...PLAYABLE_SOURCE,
          durationMs: 185_000,
        }),
        playbackPositionSeconds: 18,
      }),
      '0:18 of 3:05',
    );
  });

  it('gives a clip shorter than a second a decimal length instead of 0:00', () => {
    assert.equal(
      getProgressLabel({
        activePlayableItem: createTrackPlayableItem({
          ...PLAYABLE_SOURCE,
          durationMs: 627,
        }),
        playbackPositionSeconds: 0.2,
      }),
      '0:00 of 0:00.6',
    );
  });
});
