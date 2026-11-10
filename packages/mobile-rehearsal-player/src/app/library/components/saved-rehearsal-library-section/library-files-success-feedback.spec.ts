import assert from 'node:assert/strict';
import { describe, it } from 'node:test';

import {
  createLibraryFilesSuccessFeedback,
  createPlaylistAddSuccessFeedback,
} from './library-files-success-feedback';

describe('createLibraryFilesSuccessFeedback', () => {
  it('builds deterministic compact feedback with optional folder navigation', () => {
    const feedback = createLibraryFilesSuccessFeedback({
      action: {
        folderId: 'folder-warmups',
        label: 'View in folder',
      },
      message: 'Full Choir.mp3 moved to Warmups.',
      title: 'Moved to folder',
    });

    assert.deepEqual(feedback, {
      action: {
        folderId: 'folder-warmups',
        label: 'View in folder',
      },
      id: 'Moved to folder:Full Choir.mp3 moved to Warmups.:folder-warmups',
      message: 'Full Choir.mp3 moved to Warmups.',
      title: 'Moved to folder',
    });
  });
});

describe('createPlaylistAddSuccessFeedback', () => {
  it('names the item and the playlist it was added to', () => {
    const feedback = createPlaylistAddSuccessFeedback({
      isNewPlaylist: false,
      itemLabel: 'Alto Part',
      playlistName: 'Sunday Set',
    });

    assert.equal(feedback.title, 'Added to playlist');
    assert.equal(feedback.message, 'Alto Part was added to Sunday Set.');
  });

  it('reports a newly created playlist when the item started it', () => {
    const feedback = createPlaylistAddSuccessFeedback({
      isNewPlaylist: true,
      itemLabel: 'Alto Part',
      playlistName: 'Sunday Set',
    });

    assert.equal(feedback.title, 'Playlist created');
    assert.equal(
      feedback.message,
      'Alto Part is the first item in Sunday Set.',
    );
  });
});
