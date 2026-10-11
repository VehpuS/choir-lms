import assert from 'node:assert/strict';
import { describe, it } from 'node:test';

import type { Playlist } from '@org/audio-library-models';

import {
  getRemoveFromPlaylistAcknowledgment,
  getRemoveFromPlaylistConfirmation,
  orderPlaylistEntrySelection,
  toPlaylistEntryBulkItem,
  toPlaylistEntrySelectionEntry,
} from './playlist-entry-selection';

type Entry = Playlist['items'][number];

const trackEntry = (id: string, sourceId: string) =>
  ({ id, kind: 'track', sourceId }) as unknown as Entry;
const loopEntry = (id: string, sourceId: string, loopId: string) =>
  ({ id, kind: 'loop', loopId, sourceId }) as unknown as Entry;

describe('playlist entry selection', () => {
  it('keys an entry by its own id so a repeated track is two rows', () => {
    const first = toPlaylistEntrySelectionEntry(trackEntry('e1', 's'));
    const second = toPlaylistEntrySelectionEntry(trackEntry('e2', 's'));

    assert.notEqual(first.key, second.key);
    assert.equal(first.item.entityId, second.item.entityId);
  });

  it('plays the loop of a loop entry and the track otherwise', () => {
    assert.deepEqual(
      toPlaylistEntrySelectionEntry(loopEntry('e1', 's', 'l')).item,
      { entityId: 'l', entityKind: 'loop', entryId: 'e1' },
    );
    assert.deepEqual(
      toPlaylistEntrySelectionEntry(trackEntry('e2', 's')).item,
      { entityId: 's', entityKind: 'track', entryId: 'e2' },
    );
  });

  it('reduces an item to the playlist-entry bulk item', () => {
    assert.deepEqual(
      toPlaylistEntryBulkItem({
        entityId: 'l',
        entityKind: 'loop',
        entryId: 'e1',
      }),
      {
        entityId: 'l',
        entityKind: 'loop',
        key: 'e1',
        kind: 'playlist-entry',
      },
    );
  });

  it('orders the selection by running order and drops entries that are gone', () => {
    const entries = [
      trackEntry('e1', 'a'),
      trackEntry('e2', 'b'),
      trackEntry('e3', 'c'),
    ];
    const items = ['e3', 'gone', 'e1'].map((entryId) => ({
      entityId: entryId,
      entityKind: 'track' as const,
      entryId,
    }));

    assert.deepEqual(
      orderPlaylistEntrySelection(items, entries).map(({ entryId }) => entryId),
      ['e1', 'e3'],
    );
  });
});

describe('remove from playlist copy', () => {
  it('says the library keeps the tracks and loops', () => {
    assert.deepEqual(
      getRemoveFromPlaylistConfirmation({
        count: 2,
        playlistName: 'Advent set',
      }),
      {
        confirmLabel: 'Remove from playlist',
        message:
          '2 items will be removed from Advent set. The tracks and loops stay in your library.',
        title: 'Remove from playlist?',
      },
    );
    assert.equal(
      getRemoveFromPlaylistAcknowledgment({
        count: 1,
        playlistName: 'Advent set',
      }).message,
      '1 item removed from Advent set.',
    );
  });
});
