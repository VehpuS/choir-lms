import assert from 'node:assert/strict';
import { describe, it } from 'node:test';

import { addTrackToPlaylist, createPlaylist } from '@org/audio-library-models';

import { PLAYABLE_SOURCE } from '../../../test-utils/library-test-fixtures.js';
import {
  getSavedPlaylistCardPlayAction,
  resolveSavedPlaylistCardRenameTarget,
  resolveSavedPlaylistCards,
} from './saved-playlist-card-view-model.js';

describe('getSavedPlaylistCardPlayAction', () => {
  it('labels playable cards and disables empty ones', () => {
    const playablePlaylist = addTrackToPlaylist(
      createPlaylist({
        createdAt: '2026-05-12T00:00:00.000Z',
        name: 'Warmups',
        ownerId: 'user-1',
      }),
      PLAYABLE_SOURCE,
      '2026-05-12T00:01:00.000Z',
    );
    const emptyPlaylist = createPlaylist({
      createdAt: '2026-05-12T00:00:00.000Z',
      name: 'Set list',
      ownerId: 'user-1',
    });

    assert.deepEqual(getSavedPlaylistCardPlayAction(playablePlaylist), {
      accessibilityLabel: 'Play Warmups',
      disabled: false,
    });

    assert.deepEqual(getSavedPlaylistCardPlayAction(emptyPlaylist), {
      accessibilityLabel: 'Play Set list',
      disabled: true,
    });
  });

  it('summarizes playlist cards without add-from-editor copy', () => {
    const playlist = addTrackToPlaylist(
      createPlaylist({
        createdAt: '2026-05-12T00:00:00.000Z',
        name: 'Warmups',
        ownerId: 'user-1',
      }),
      PLAYABLE_SOURCE,
      '2026-05-12T00:01:00.000Z',
    );

    assert.deepEqual(resolveSavedPlaylistCards([playlist]), [
      {
        detailLabel: '1 item • 1 track • 0 loops',
        playlist,
        previewLabel: 'Alto Line.mp3',
      },
    ]);
  });

  it('collapses empty playlist cards to one concise empty label', () => {
    const emptyPlaylist = createPlaylist({
      createdAt: '2026-05-12T00:00:00.000Z',
      name: 'Set list',
      ownerId: 'user-1',
    });

    assert.deepEqual(resolveSavedPlaylistCards([emptyPlaylist]), [
      {
        detailLabel: 'Empty playlist',
        playlist: emptyPlaylist,
        previewLabel: null,
      },
    ]);
  });

  it('resolves playlist-card rename targets without requiring detail selection', () => {
    const playlist = addTrackToPlaylist(
      createPlaylist({
        createdAt: '2026-05-12T00:00:00.000Z',
        name: 'Warmups',
        ownerId: 'user-1',
      }),
      PLAYABLE_SOURCE,
      '2026-05-12T00:01:00.000Z',
    );
    const playlistCards = resolveSavedPlaylistCards([playlist]);

    assert.deepEqual(
      resolveSavedPlaylistCardRenameTarget(playlistCards, playlist.id),
      {
        playlistId: playlist.id,
        playlistName: 'Warmups',
        value: 'Warmups',
      },
    );
    assert.equal(
      resolveSavedPlaylistCardRenameTarget(playlistCards, 'missing'),
      null,
    );
  });
});
