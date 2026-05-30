import assert from 'node:assert/strict';
import { describe, it } from 'node:test';

import { addTrackToPlaylist, createPlaylist } from '@org/audio-library-models';

import { PLAYABLE_SOURCE } from '../../test-utils/library-test-fixtures.js';
import { getSavedPlaylistCardPlayAction } from '../utils/saved-playlist-card-view-model.js';

describe('getSavedPlaylistCardPlayAction', () => {
  it('labels playable cards and disables empty ones', () => {
    const playablePlaylist = addTrackToPlaylist(
      createPlaylist({
        createdAt: '2026-05-12T00:00:00.000Z',
        name: 'Warmups',
        ownerId: 'user-1',
      }),
      PLAYABLE_SOURCE,
      '2026-05-12T00:01:00.000Z',
    );
    const emptyPlaylist = createPlaylist({
      createdAt: '2026-05-12T00:00:00.000Z',
      name: 'Set list',
      ownerId: 'user-1',
    });

    assert.deepEqual(getSavedPlaylistCardPlayAction(playablePlaylist), {
      accessibilityLabel: 'Play Warmups',
      disabled: false,
    });

    assert.deepEqual(getSavedPlaylistCardPlayAction(emptyPlaylist), {
      accessibilityLabel: 'Play Set list',
      disabled: true,
    });
  });
});