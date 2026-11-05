import assert from 'node:assert/strict';
import { describe, it } from 'node:test';

import { buildWarmupsPlaybackSession } from './saved-playlist-test-fixtures.js';
import { getSkippedItemsIssue } from './saved-playlist-skipped-items.js';

describe('skipped playlist items', () => {
  it('says how many playlist items were skipped as unavailable', () => {
    const session = buildWarmupsPlaybackSession();
    const skipped = getSkippedItemsIssue({
      ...session,
      requestedItemCount: session.queue.items.length + 2,
    });

    assert.equal(skipped?.title, 'Playlist items skipped');
    assert.ok(skipped?.message.startsWith('2 items were skipped'));
    assert.equal(getSkippedItemsIssue(session), null);
  });
});
