/// <reference types="node" />

import assert from 'node:assert/strict';
import { describe, it } from 'node:test';

import {
  createLoopPlayableItem,
  createTrackPlayableItem,
} from '@org/audio-library-models';

import {
  PLAYABLE_SOURCE,
  SAVED_LOOP,
} from '../../../test-utils/library-test-fixtures.js';
import { getSavedTrackPlaybackActionCopy } from './saved-track-playback-presentation.js';

describe('saved track playback presentation', () => {
  it('keeps other rows playable while one item loads, and disables only the loading row', () => {
    const loadingItem = createTrackPlayableItem(PLAYABLE_SOURCE);
    const otherItem = createLoopPlayableItem(SAVED_LOOP, PLAYABLE_SOURCE);

    // Starting another item supersedes the load (8.33), so it stays enabled.
    assert.deepEqual(
      getSavedTrackPlaybackActionCopy({
        activePlayableItem: loadingItem,
        isPreparing: true,
        playableItem: otherItem,
        playbackState: undefined,
      }),
      { disabled: false, label: 'Play' },
    );
    assert.deepEqual(
      getSavedTrackPlaybackActionCopy({
        activePlayableItem: loadingItem,
        isPreparing: true,
        playableItem: loadingItem,
        playbackState: undefined,
      }),
      { disabled: true, label: 'Loading…' },
    );
  });
});
