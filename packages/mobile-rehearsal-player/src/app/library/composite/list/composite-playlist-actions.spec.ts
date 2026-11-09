import assert from 'node:assert/strict';
import { describe, it } from 'node:test';

import { createPlaylist } from '@org/audio-library-models';

import {
  addCompositeEntry,
  createPlaylistWithComposite,
  getCompositeAddedAcknowledgment,
} from './composite-playlist-actions';

const stem = (id: string) => ({
  id,
  trackId: `t-${id}`,
  name: id,
  offsetMs: 0,
  mine: false,
});
const composite = { id: 'c1', name: 'Ubi', stems: [stem('s'), stem('a')] };

describe('composite playlist actions', () => {
  it('appends a composite entry that names the composite and its badge', () => {
    const playlist = addCompositeEntry(
      createPlaylist({ name: 'Sunday', ownerId: 'o' }),
      composite,
      '2026-11-09T00:00:00.000Z',
    );

    assert.equal(playlist.items.length, 1);
    assert.equal(playlist.items[0].kind, 'composite');
    assert.equal(playlist.items[0].sourceId, 'c1');
    assert.equal(playlist.items[0].description, 'Composite · 2 stems');
  });

  it('starts a new playlist with the composite', () => {
    const playlist = createPlaylistWithComposite('Sunday', composite);

    assert.equal(playlist.name, 'Sunday');
    assert.deepEqual(
      playlist.items.map((entry) => entry.sourceId),
      ['c1'],
    );
  });

  it('says which composite went into which playlist', () => {
    assert.deepEqual(getCompositeAddedAcknowledgment('Ubi', 'Sunday'), {
      title: 'Added to playlist',
      message: '“Ubi” added to Sunday.',
    });
  });
});
