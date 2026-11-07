import assert from 'node:assert/strict';
import { describe, it } from 'node:test';

import {
  addCompositeToPlaylist,
  addTrackToPlaylist,
  createDriveAudioSource,
  createPlaylist,
  type CompositeTrack,
  type DriveAudioSource,
} from '@org/audio-library-models';

import { createPlaybackQueue } from './playback-queue.ts';

const track = (driveFileId: string, durationMs: number): DriveAudioSource => ({
  ...createDriveAudioSource({
    driveFileId,
    name: driveFileId,
    mimeType: 'audio/mpeg',
    availability: { status: 'available' },
  } as Parameters<typeof createDriveAudioSource>[0]),
  durationMs,
});
const soprano = track('d1', 100_000);
const bass = track('d2', 100_000);
const composite: CompositeTrack = {
  id: 'c1',
  name: 'Ubi caritas',
  createdAt: '2026-11-07T00:00:00.000Z',
  stems: [
    {
      id: 's1',
      trackId: soprano.id,
      name: 'Soprano',
      offsetMs: 0,
      mine: false,
    },
    { id: 's2', trackId: bass.id, name: 'Bass', offsetMs: 0, mine: true },
  ],
  defaultMix: { levels: {} },
  presets: [],
};
const playlist = addCompositeToPlaylist(
  addTrackToPlaylist(createPlaylist({ name: 'Set', ownerId: 'me' }), soprano),
  composite,
);

describe('createPlaybackQueue with composites', () => {
  it('plays a composite entry as a composite item after the track', () => {
    const queue = createPlaybackQueue(playlist, [], [soprano, bass], {
      composites: [composite],
    });

    assert.deepEqual(
      queue.items.map((item) => item.kind),
      ['track', 'composite'],
    );
    assert.equal(queue.items[1].source.durationMs, 100_000);
    assert.equal(queue.items[1].playlistId, playlist.id);
    assert.equal(queue.items[1].playlistEntryId, playlist.items[1].id);
  });

  it('skips a composite that was deleted or that this build does not know', () => {
    const queue = createPlaybackQueue(playlist, [], [soprano, bass]);

    assert.deepEqual(
      queue.items.map((item) => item.kind),
      ['track'],
    );
  });

  it('skips a composite whose stems are all gone and plays one that has a stem left', () => {
    const none = createPlaybackQueue(playlist, [], [], {
      composites: [composite],
    });
    const some = createPlaybackQueue(playlist, [], [soprano], {
      composites: [composite],
    });

    assert.equal(none.items.length, 0);
    assert.deepEqual(
      some.items.map((item) => item.kind),
      ['track', 'composite'],
    );
  });
});
