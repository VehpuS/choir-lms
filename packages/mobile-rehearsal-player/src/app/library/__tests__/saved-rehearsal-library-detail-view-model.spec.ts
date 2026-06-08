import assert from 'node:assert/strict';
import { describe, it } from 'node:test';

import { resolveSavedRehearsalLibraryDetailMode } from '../utils/saved-rehearsal-library-detail-view-model.js';

describe('saved rehearsal library detail view-model', () => {
  it('stays in browse mode when no detail surface is active', () => {
    assert.equal(
      resolveSavedRehearsalLibraryDetailMode({
        isPlaylistDetailVisible: false,
        selectedLoopViewSourceId: null,
      }),
      'browse',
    );
  });

  it('switches to track loop detail when View track loops is active', () => {
    assert.equal(
      resolveSavedRehearsalLibraryDetailMode({
        isPlaylistDetailVisible: false,
        selectedLoopViewSourceId: 'drive:alto-line',
      }),
      'track-loop-detail',
    );
  });

  it('keeps playlist detail as the dominant detail mode', () => {
    assert.equal(
      resolveSavedRehearsalLibraryDetailMode({
        isPlaylistDetailVisible: true,
        selectedLoopViewSourceId: 'drive:alto-line',
      }),
      'playlist-detail',
    );
  });
});
