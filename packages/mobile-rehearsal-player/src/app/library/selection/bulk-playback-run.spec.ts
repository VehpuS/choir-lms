import assert from 'node:assert/strict';
import { describe, it } from 'node:test';

import { createDriveAudioSource } from '@org/audio-library-models';

import {
  getBulkPlaybackAcknowledgment,
  prepareBulkPlayback,
} from './bulk-playback-run';
import type { PlaybackExpansionContext } from './playback-expansion';

const trackSource = (name: string) =>
  createDriveAudioSource({
    availability: { status: 'available' },
    driveFileId: `drive-${name}`,
    mimeType: 'audio/mpeg',
    name: `${name}.mp3`,
  });

const emptyContext: PlaybackExpansionContext = {
  getFolderChildren: () => [],
  getPlaylistRefs: () => [],
};

describe('prepareBulkPlayback', () => {
  it('keeps the selection order and counts refs that cannot play', () => {
    const first = trackSource('first');
    const second = trackSource('second');
    const prepared = prepareBulkPlayback({
      collections: { loops: [], sources: [first, second] },
      context: emptyContext,
      expansionOptions: { playlists: 'skip', repeats: 'keep' },
      items: [
        { entityId: second.id, key: 'b', kind: 'track' },
        { entityId: 'gone', key: 'x', kind: 'track' },
        { entityId: first.id, key: 'a', kind: 'track' },
      ],
    });

    assert.deepEqual(
      prepared.playableItems.map(({ sourceId }) => sourceId),
      [second.id, first.id],
    );
    assert.equal(prepared.unavailableCount, 1);
    assert.equal(prepared.refs.length, 3);
  });

  it('removes repeats only when the user asked for it', () => {
    const only = trackSource('only');
    const items = [
      { entityId: only.id, key: 'a', kind: 'track' as const },
      { entityId: only.id, key: 'b', kind: 'track' as const },
    ];
    const run = (repeats: 'keep' | 'remove') =>
      prepareBulkPlayback({
        collections: { loops: [], sources: [only] },
        context: emptyContext,
        expansionOptions: { playlists: 'skip', repeats },
        items,
      }).playableItems.length;

    assert.equal(run('keep'), 2);
    assert.equal(run('remove'), 1);
  });
});

describe('getBulkPlaybackAcknowledgment', () => {
  it('says what happened for each action with singular and plural counts', () => {
    assert.deepEqual(
      getBulkPlaybackAcknowledgment({
        action: 'play-next',
        count: 1,
        leftOutCount: 0,
      }),
      { message: '1 item will play next, in order.', title: 'Playing next' },
    );
    assert.deepEqual(
      getBulkPlaybackAcknowledgment({
        action: 'add-to-queue',
        count: 3,
        leftOutCount: 0,
      }),
      {
        message: '3 items added to the end of the queue.',
        title: 'Added to queue',
      },
    );
    assert.deepEqual(
      getBulkPlaybackAcknowledgment({
        action: 'add-to-playlist',
        count: 2,
        leftOutCount: 0,
        playlistName: 'Set list',
      }),
      { message: '2 items added to Set list.', title: 'Added to playlist' },
    );
    assert.deepEqual(
      getBulkPlaybackAcknowledgment({
        action: 'save-as-playlist',
        count: 4,
        leftOutCount: 0,
        playlistName: 'Warm-ups',
      }),
      { message: 'Warm-ups has 4 items.', title: 'Playlist created' },
    );
  });

  it('reports how many items were left out', () => {
    assert.equal(
      getBulkPlaybackAcknowledgment({
        action: 'add-to-queue',
        count: 2,
        leftOutCount: 1,
      }).message,
      '2 items added to the end of the queue. 1 item could not be used.',
    );
  });
});
