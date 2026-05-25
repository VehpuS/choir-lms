/// <reference types="node" />

import assert from 'node:assert/strict';
import { describe, it } from 'node:test';

import { createPlaylist } from '@org/audio-library-models';

import { PLAYABLE_SOURCE } from '../../test-utils/library-test-fixtures.js';
import {
  getSavedPlaylistLibraryActionCopy,
  getSavedPlaylistRemovalCopy,
  getSavedPlaylistSelectionCopy,
  resolveSavedPlaylistCards,
  resolveSelectedPlaylist,
} from '../utils/saved-playlist-view-model.js';

describe('saved playlist view-model', () => {
  it('falls back to the first saved playlist when no selection is active', () => {
    const firstPlaylist = createPlaylist({
      createdAt: '2026-05-12T00:00:00.000Z',
      name: 'Warmups',
      ownerId: 'user-1',
    });
    const secondPlaylist = createPlaylist({
      createdAt: '2026-05-12T00:01:00.000Z',
      name: 'Service order',
      ownerId: 'user-1',
    });

    assert.equal(
      resolveSelectedPlaylist([firstPlaylist, secondPlaylist], null)?.id,
      firstPlaylist.id,
    );
    assert.equal(
      resolveSelectedPlaylist([firstPlaylist, secondPlaylist], 'missing')?.id,
      firstPlaylist.id,
    );
  });

  it('describes the selected playlist as the Library add target', () => {
    const playlist = createPlaylist({
      createdAt: '2026-05-12T00:00:00.000Z',
      name: 'Warmups',
      ownerId: 'user-1',
    });

    assert.deepEqual(
      getSavedPlaylistLibraryActionCopy({
        canMutatePlaylists: true,
        isMutating: false,
        selectedPlaylist: playlist,
      }),
      {
        disabled: false,
        label: 'Add to Warmups',
      },
    );
  });

  it('surfaces selection guidance when multiple playlists exist', () => {
    const playlist = createPlaylist({
      createdAt: '2026-05-12T00:00:00.000Z',
      name: 'Warmups',
      ownerId: 'user-1',
    });

    assert.deepEqual(
      getSavedPlaylistSelectionCopy({
        savedPlaylistCount: 2,
        selectedPlaylist: playlist,
      }),
      {
        title: 'Adding to Warmups',
        message:
          'Choose a different playlist below any time you want Library actions to add into another rehearsal set.',
        tone: 'ready',
      },
    );
  });

  it('asks for a destination before Library add actions run', () => {
    assert.deepEqual(
      getSavedPlaylistSelectionCopy({
        savedPlaylistCount: 2,
        selectedPlaylist: null,
      }),
      {
        title: 'Choose a playlist destination',
        message:
          'Select a playlist below before adding saved tracks or loops from Library.',
        tone: 'neutral',
      },
    );
  });

  it('builds destructive removal copy for empty and populated playlists', () => {
    const emptyPlaylist = createPlaylist({
      createdAt: '2026-05-12T00:00:00.000Z',
      name: 'Warmups',
      ownerId: 'user-1',
    });
    const populatedPlaylist = createPlaylist({
      createdAt: '2026-05-12T00:00:00.000Z',
      items: [
        {
          id: `entry:track:${PLAYABLE_SOURCE.id}:2026-05-12T00:00:00.000Z`,
          kind: 'track',
          sourceId: PLAYABLE_SOURCE.id,
          title: PLAYABLE_SOURCE.name,
          description: 'Full track',
          createdAt: '2026-05-12T00:00:00.000Z',
        },
      ],
      name: 'Warmups',
      ownerId: 'user-1',
    });

    assert.deepEqual(getSavedPlaylistRemovalCopy(emptyPlaylist), {
      confirmLabel: 'Remove playlist',
      message: '"Warmups" will be removed from your saved playlists.',
      title: 'Remove saved playlist?',
    });
    assert.deepEqual(getSavedPlaylistRemovalCopy(populatedPlaylist), {
      confirmLabel: 'Remove playlist',
      message:
        '"Warmups" will be removed from your saved playlists.\n\nThis will remove 1 item from this playlist only. Saved tracks and loops will stay in Library.',
      title: 'Remove saved playlist?',
    });
  });

  it('disables Library add actions until a playlist is selected and while mutations run', () => {
    const playlist = createPlaylist({
      createdAt: '2026-05-12T00:00:00.000Z',
      name: 'Warmups',
      ownerId: 'user-1',
    });

    assert.deepEqual(
      getSavedPlaylistLibraryActionCopy({
        canMutatePlaylists: true,
        isMutating: false,
        selectedPlaylist: null,
      }),
      {
        disabled: true,
        label: 'Select playlist',
      },
    );

    assert.deepEqual(
      getSavedPlaylistLibraryActionCopy({
        canMutatePlaylists: true,
        isMutating: true,
        selectedPlaylist: playlist,
      }),
      {
        disabled: true,
        label: 'Updating playlist…',
      },
    );
  });

  it('summarizes playlist cards without add-from-editor copy', () => {
    const playlist = createPlaylist({
      createdAt: '2026-05-12T00:00:00.000Z',
      items: [
        {
          id: `entry:track:${PLAYABLE_SOURCE.id}:2026-05-12T00:00:00.000Z`,
          kind: 'track',
          sourceId: PLAYABLE_SOURCE.id,
          title: PLAYABLE_SOURCE.name,
          description: 'Full track',
          createdAt: '2026-05-12T00:00:00.000Z',
        },
      ],
      name: 'Warmups',
      ownerId: 'user-1',
    });

    assert.deepEqual(resolveSavedPlaylistCards([playlist]), [
      {
        detailLabel: '1 item • 1 track • 0 loops',
        playlist,
        previewLabel: 'Alto Line.mp3',
      },
    ]);
  });
});
