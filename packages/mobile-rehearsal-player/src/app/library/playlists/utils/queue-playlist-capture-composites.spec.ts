/// <reference types="node" />

import assert from 'node:assert/strict';
import { describe, it } from 'node:test';

import {
  createCompositePlayableItem,
  createTrackPlayableItem,
  type CompositeTrack,
} from '@org/audio-library-models';

import { PLAYABLE_SOURCE } from '../../../test-utils/library-test-fixtures.js';
import { buildSavedPlaylistFromQueue } from './queue-playlist-capture.js';
import { queuePlayableItemDuringPlayback } from './saved-playlist-playback-view-model.js';

// A queued composite is saved into a playlist by reference, and must not be
// taken for a track to add to the library or a loop that went missing.
const stem = (id: string) => ({
  id,
  trackId: `t-${id}`,
  name: id,
  offsetMs: 0,
  mine: false,
});
const composite = {
  id: 'c1',
  name: 'Ubi',
  createdAt: '2026-11-09T00:00:00.000Z',
  stems: [stem('s'), stem('a')],
} as unknown as CompositeTrack;

const sessionWithComposite = () => {
  const track = createTrackPlayableItem(PLAYABLE_SOURCE);

  return queuePlayableItemDuringPlayback({
    activePlayableItem: track,
    playableItem: createCompositePlayableItem(composite),
    position: 'up-next',
    repeatMode: 'off',
    session: null,
  });
};

const capture = (composites: readonly CompositeTrack[]) =>
  buildSavedPlaylistFromQueue({
    composites,
    name: 'Sunday',
    now: '2026-11-09T10:00:00.000Z',
    ownerId: 'user-1',
    savedLoops: [],
    savedSources: [PLAYABLE_SOURCE],
    session: sessionWithComposite(),
  });

describe('queue playlist capture with composites', () => {
  it('saves a queued composite as a composite entry and adds no track to the library', () => {
    const result = capture([composite]);

    assert.equal(result.issue, null);
    assert.deepEqual(
      result.playlist?.items.map((entry) => [entry.kind, entry.sourceId]),
      [
        ['track', PLAYABLE_SOURCE.id],
        ['composite', 'c1'],
      ],
    );
    assert.deepEqual(result.unsavedSources, []);
  });

  it('names a composite that left the library instead of calling it a loop', () => {
    const result = capture([]);

    assert.equal(result.playlist, null);
    assert.equal(result.issue?.title, 'Queued composite unavailable');
  });
});
