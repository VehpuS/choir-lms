import assert from 'node:assert/strict';
import { describe, it } from 'node:test';

import {
  consumeSavedPlaylistRenameRequest,
  getSavedPlaylistDetailItemRemovalCopy,
  getSavedPlaylistDetailPlaybackAction,
  queueSavedPlaylistRenameRequest,
} from './saved-playlist-detail-view-model.js';

describe('saved playlist detail rename request helpers', () => {
  it('queues and consumes rename requests for the matching playlist only', () => {
    queueSavedPlaylistRenameRequest('playlist-1');

    assert.equal(consumeSavedPlaylistRenameRequest('playlist-2'), false);
    assert.equal(consumeSavedPlaylistRenameRequest('playlist-1'), true);
    assert.equal(consumeSavedPlaylistRenameRequest('playlist-1'), false);
  });

  it('uses play semantics for non-current playlist rows', () => {
    assert.deepEqual(
      getSavedPlaylistDetailPlaybackAction({
        isCurrentEntry: false,
        playbackToggleLabel: 'Pause',
        title: 'Alto Line.mp3',
      }),
      {
        accessibilityLabel: 'Play Alto Line.mp3',
        iconName: 'play',
        pressBehavior: 'play-item',
      },
    );
  });

  it('uses the current playback toggle label for the active playlist row', () => {
    assert.deepEqual(
      getSavedPlaylistDetailPlaybackAction({
        isCurrentEntry: true,
        playbackToggleLabel: 'Pause',
        title: 'Alto Line.mp3',
      }),
      {
        accessibilityLabel: 'Pause Alto Line.mp3',
        iconName: 'pause',
        pressBehavior: 'toggle-current',
      },
    );
    assert.deepEqual(
      getSavedPlaylistDetailPlaybackAction({
        isCurrentEntry: true,
        playbackToggleLabel: 'Resume',
        title: 'Alto Line.mp3',
      }),
      {
        accessibilityLabel: 'Resume Alto Line.mp3',
        iconName: 'play',
        pressBehavior: 'toggle-current',
      },
    );
  });

  it('builds confirmation copy for playlist item removal alerts', () => {
    assert.deepEqual(
      getSavedPlaylistDetailItemRemovalCopy({
        entryTitle: 'Alto Line.mp3',
        playlistTitle: 'Warmups',
      }),
      {
        confirmLabel: 'Remove item',
        message:
          '"Alto Line.mp3" will be removed from Warmups. You can undo after removal.',
        title: 'Remove playlist item?',
      },
    );
  });
});
