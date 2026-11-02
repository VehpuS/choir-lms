import assert from 'node:assert/strict';
import { describe, it } from 'node:test';

import { createPlaylist } from '@org/audio-library-models';

import { buildRecordingFixture } from './recording-fixtures.js';
import {
  addRecordingsToPlaylist,
  createPlaylistWithRecordings,
  getAddedToPlaylistAcknowledgment,
  getPlaylistPickerTitle,
} from './recording-playlist-actions.js';

const first = buildRecordingFixture({ id: 'r1', name: 'Take 1' });
const second = buildRecordingFixture({ id: 'r2', name: 'Take 2' });

describe('recording playlist actions', () => {
  it('appends recordings in order with a recording indicator in the description', () => {
    const playlist = addRecordingsToPlaylist(
      createPlaylist({ name: 'Set', ownerId: 'me' }),
      [first, second],
    );

    assert.deepEqual(
      playlist.items.map((entry) => [entry.recordingId, entry.sortIndex]),
      [
        ['r1', 0],
        ['r2', 1],
      ],
    );
    assert.equal(playlist.items[0].description, 'Recording · Song.mp3');
  });

  it('starts a new playlist with the recordings', () => {
    const playlist = createPlaylistWithRecordings('Wednesday', [first]);

    assert.equal(playlist.name, 'Wednesday');
    assert.equal(playlist.items.length, 1);
  });

  it('titles the sheet by name for one recording and by count for several', () => {
    assert.equal(getPlaylistPickerTitle([first]), 'Take 1');
    assert.equal(getPlaylistPickerTitle([first, second]), '2 recordings');
  });

  it('acknowledges what was added and where', () => {
    assert.deepEqual(getAddedToPlaylistAcknowledgment(2, 'Set'), {
      title: 'Added to playlist',
      message: '2 recordings added to Set.',
    });
  });
});
