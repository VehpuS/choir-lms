import assert from 'node:assert/strict';
import { describe, it } from 'node:test';

import {
  addCompositeToPlaylist,
  addTrackToPlaylist,
  createPlaylist,
  type CompositeTrack,
} from '@org/audio-library-models';

import { PLAYABLE_SOURCE } from '../../../test-utils/library-test-fixtures.js';
import { isSavedPlaylistEntryPlayable } from './saved-playlist-detail-view-model.js';
import { buildPlaylistPlaybackSession } from './saved-playlist-playback-view-model.js';
import { getSavedPlaylistEntryDetailLabel } from './saved-playlist-view-model.js';

// Composite entries resolve against the composites passed in (the default is
// the app's store snapshot), so these specs pass them explicitly.
const stem = (id: string, trackId: string) => ({
  id,
  trackId,
  name: id,
  offsetMs: 0,
  mine: false,
});
const composite = {
  id: 'c1',
  name: 'Ubi',
  createdAt: '2026-11-09T00:00:00.000Z',
  stems: [stem('s', PLAYABLE_SOURCE.id), stem('a', 'missing-track')],
  defaultMix: { levels: {} },
  presets: [],
} as unknown as CompositeTrack;
const goneComposite = {
  ...composite,
  stems: [stem('s', 'gone-1'), stem('a', 'gone-2')],
} as CompositeTrack;

const playlistWith = (target: CompositeTrack) =>
  addCompositeToPlaylist(
    addTrackToPlaylist(
      createPlaylist({ name: 'Sunday', ownerId: 'o' }),
      PLAYABLE_SOURCE,
    ),
    target,
  );

describe('composite playlist entries', () => {
  it('plays alongside tracks, in order, while one stem can sound', () => {
    const { session, issue } = buildPlaylistPlaybackSession({
      composites: [composite],
      loops: [],
      mode: 'ordered',
      playlist: playlistWith(composite),
      recordings: [],
      repeatMode: 'off',
      sources: [PLAYABLE_SOURCE],
    });

    assert.equal(issue, null);
    assert.deepEqual(
      session?.queue.items.map((item) => item.kind),
      ['track', 'composite'],
    );
  });

  it('skips a composite that was deleted or has every stem gone, and counts it unavailable', () => {
    for (const composites of [[], [goneComposite]]) {
      const { session } = buildPlaylistPlaybackSession({
        composites,
        loops: [],
        mode: 'ordered',
        playlist: playlistWith(composite),
        recordings: [],
        repeatMode: 'off',
        sources: [PLAYABLE_SOURCE],
      });

      assert.deepEqual(
        session?.queue.items.map((item) => item.kind),
        ['track'],
      );
      assert.equal(session?.requestedItemCount, 2);
    }
  });

  it('says whether an entry plays and how it reads', () => {
    const entry = playlistWith(composite).items[1];
    const common = { entry, savedLoops: [], savedSources: [PLAYABLE_SOURCE] };

    assert.equal(
      isSavedPlaylistEntryPlayable({ ...common, composites: [composite] }),
      true,
    );
    assert.equal(
      isSavedPlaylistEntryPlayable({ ...common, composites: [] }),
      false,
    );
    assert.match(
      getSavedPlaylistEntryDetailLabel({ ...common, composites: [composite] }),
      /^Composite • 2 stems/,
    );
    assert.equal(
      getSavedPlaylistEntryDetailLabel({ ...common, composites: [] }),
      'Composite deleted',
    );
  });
});
