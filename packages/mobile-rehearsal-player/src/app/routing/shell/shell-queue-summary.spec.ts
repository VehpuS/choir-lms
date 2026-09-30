/// <reference types="node" />

import assert from 'node:assert/strict';
import { describe, it } from 'node:test';

import { buildWarmupsPlaybackSession } from '../../library/playlists/utils/saved-playlist-test-fixtures.js';
import { PLAYABLE_SOURCE } from '../../test-utils/library-test-fixtures.js';
import { getQueueSessionMetaLabel } from './shell-playback-summary-model.js';

describe('queue session meta label', () => {
  it('counts items, totals their lengths, and names the queue and repeat modes', () => {
    const session = buildWarmupsPlaybackSession({
      mode: 'shuffle',
      repeatMode: 'one',
      sources: [PLAYABLE_SOURCE],
    });

    // The track plays 3:05 and the loop 0:06.
    assert.equal(
      getQueueSessionMetaLabel(session),
      '2 items · 3:11 · shuffle · repeat one',
    );
  });

  it('uses the singular for a one-item queue', () => {
    const session = buildWarmupsPlaybackSession({ sources: [PLAYABLE_SOURCE] });
    const label = getQueueSessionMetaLabel({
      ...session,
      queue: { ...session.queue, items: session.queue.items.slice(0, 1) },
      requestedItemCount: 1,
    });

    assert.equal(label, '1 item · 3:05 · ordered · repeat off');
  });

  it('leaves the total out rather than understating it when an item has no length', () => {
    const session = buildWarmupsPlaybackSession({
      sources: [{ ...PLAYABLE_SOURCE, durationMs: undefined }],
    });

    assert.equal(
      getQueueSessionMetaLabel(session),
      '2 items · ordered · repeat off',
    );
  });

  it('reports items that could not be queued and a finished session', () => {
    const session = buildWarmupsPlaybackSession({ sources: [PLAYABLE_SOURCE] });

    assert.equal(
      getQueueSessionMetaLabel({
        ...session,
        hasCompleted: true,
        requestedItemCount: session.queue.items.length + 3,
      }),
      '2 items · 3:11 · ordered · repeat off · 3 unavailable · finished',
    );
  });

  it('names the queue once, without repeating the playlist name or position', () => {
    const session = buildWarmupsPlaybackSession({ sources: [PLAYABLE_SOURCE] });

    assert.ok(
      !getQueueSessionMetaLabel(session).includes(session.playlistName),
    );
    assert.ok(!/item \d+ of/i.test(getQueueSessionMetaLabel(session)));
  });
});
