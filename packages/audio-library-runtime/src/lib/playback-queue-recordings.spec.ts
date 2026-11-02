import assert from 'node:assert/strict';
import { describe, it } from 'node:test';

import {
  addRecordingToPlaylist,
  addTrackToPlaylist,
  createDriveAudioSource,
  createPlaylist,
  type Recording,
} from '@org/audio-library-models';

import { createPlaybackQueue } from './playback-queue.ts';

const source = createDriveAudioSource({
  driveFileId: 'd1',
  name: 'Song',
  mimeType: 'audio/mpeg',
  availability: { status: 'available' },
} as Parameters<typeof createDriveAudioSource>[0]);
const recording = {
  id: 'r1',
  name: 'Take 1',
  lineage: { track: { id: source.id, driveFileId: 'd1', name: 'Song' } },
  source: {
    driveFileId: 'd1',
    name: 'Song',
    contentVersion: 'v',
    durationMs: 1,
  },
  shaping: { rate: 1, pitchSemitones: 0 },
  timeline: [
    {
      recordingStartMs: 0,
      recordingEndMs: 5_000,
      trackStartMs: 0,
      held: false,
    },
  ],
} as unknown as Recording;
const playlist = addRecordingToPlaylist(
  addTrackToPlaylist(createPlaylist({ name: 'Set', ownerId: 'me' }), source),
  recording,
);

describe('createPlaybackQueue with recordings', () => {
  it('plays a recording entry in its recorded context after the track', () => {
    const queue = createPlaybackQueue(playlist, [], [source], {
      recordings: [recording],
    });

    assert.deepEqual(
      queue.items.map((item) => item.recordingId),
      [undefined, 'r1'],
    );
    assert.equal(queue.items[1].playlistEntryId, playlist.items[1].id);
  });

  it('skips a recording that was deleted and keeps the rest', () => {
    const queue = createPlaybackQueue(playlist, [], [source], {
      recordings: [],
    });

    assert.equal(queue.items.length, 1);
  });
});
