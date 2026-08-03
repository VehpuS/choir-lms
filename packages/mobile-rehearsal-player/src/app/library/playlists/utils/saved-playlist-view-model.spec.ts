/// <reference types="node" />

import assert from 'node:assert/strict';
import { describe, it } from 'node:test';

import { createPlaylist } from '@org/audio-library-models';

import {
  PLAYABLE_SOURCE,
  SAVED_LOOP,
} from '../../../test-utils/library-test-fixtures.js';
import {
  buildTrackOnlyWarmupsPlaylist,
  buildWarmupsPlaybackSession,
  buildWarmupsPlaylist,
} from './saved-playlist-test-fixtures.js';
import {
  buildSavedPlaylist,
  getPlaylistOptionsMenuActions,
  getSavedPlaylistCreateDialogCopy,
  getSavedPlaylistDetailSummary,
  getSavedPlaylistEntryDetailLabel,
  getSavedPlaylistRemovalCopy,
  resolveSelectedPlaylist,
} from './saved-playlist-view-model.js';

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

  it('requires a playlist name and trims the saved name once provided', () => {
    const emptyResult = buildSavedPlaylist({
      name: '   ',
      ownerId: 'local-device-user',
    });

    assert.deepEqual(emptyResult, {
      issue: {
        title: 'Playlist name required',
        message: 'Enter a playlist name.',
      },
      playlist: null,
    });

    const validResult = buildSavedPlaylist({
      name: '  Wednesday rehearsal  ',
      now: '2026-05-11T00:00:00.000Z',
      ownerId: 'local-device-user',
    });

    assert.equal(validResult.issue, null);
    assert.equal(validResult.playlist?.name, 'Wednesday rehearsal');
    assert.equal(
      validResult.playlist?.id,
      'playlist:local-device-user:2026-05-11T00:00:00.000Z',
    );
  });

  it('builds destructive removal copy for empty and populated playlists', () => {
    const emptyPlaylist = createPlaylist({
      createdAt: '2026-05-12T00:00:00.000Z',
      name: 'Warmups',
      ownerId: 'user-1',
    });
    const populatedPlaylist = buildTrackOnlyWarmupsPlaylist();

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

  it('provides shared copy for the create playlist dialog', () => {
    assert.deepEqual(getSavedPlaylistCreateDialogCopy(), {
      body: 'Create a new playlist from saved rehearsal material.',
      cancelLabel: 'Cancel',
      placeholder: 'Wednesday rehearsal',
      savingLabel: 'Creating…',
      submitLabel: 'Create playlist',
      title: 'Create playlist',
    });
  });

  it('includes add items and remove in shared playlist overflow actions when requested', () => {
    const actions = getPlaylistOptionsMenuActions({
      onAddItems: () => undefined,
      onEditTags: () => undefined,
      isMutating: false,
      onRemove: () => undefined,
      onRename: () => undefined,
    });

    assert.deepEqual(
      actions.map((action) => ({
        disabled: action.disabled ?? false,
        id: action.id,
        label: action.label,
        tone: action.tone,
      })),
      [
        {
          disabled: false,
          id: 'add-playlist-items',
          label: 'Add items',
          tone: 'secondary',
        },
        {
          disabled: false,
          id: 'rename-playlist',
          label: 'Rename playlist',
          tone: 'primary',
        },
        {
          disabled: false,
          id: 'edit-playlist-tags',
          label: 'Edit tags',
          tone: 'secondary',
        },
        {
          disabled: false,
          id: 'remove-playlist',
          label: 'Remove playlist',
          tone: 'destructive',
        },
      ],
    );
  });

  it('keeps pre-playback playlist detail copy focused on order and playback intent', () => {
    const playlist = createPlaylist({
      createdAt: '2026-05-12T00:00:00.000Z',
      name: 'Warmups',
      ownerId: 'user-1',
    });

    assert.deepEqual(
      getSavedPlaylistDetailSummary({
        activeSession: null,
        playlist,
        savedLoops: [],
        savedSources: [],
      }),
      {
        body: null,
        metadataLabel: '0 items • Personal',
        title: 'Warmups',
      },
    );
  });

  it('builds dedicated playlist detail copy and item labels', () => {
    const playlist = buildWarmupsPlaylist();
    const session = buildWarmupsPlaybackSession({
      playlist,
      repeatMode: 'all',
      sources: [PLAYABLE_SOURCE],
    });

    assert.deepEqual(
      getSavedPlaylistDetailSummary({
        activeSession: session,
        playlist,
        savedLoops: [SAVED_LOOP],
        savedSources: [PLAYABLE_SOURCE],
      }),
      {
        body: 'Active session • Warmups • item 1 of 2 • Ordered • Repeat all.',
        metadataLabel: '2 items • 3:11 total • Personal',
        title: 'Warmups',
      },
    );
    assert.equal(
      getSavedPlaylistEntryDetailLabel({
        entry: playlist.items[0],
        savedLoops: [SAVED_LOOP],
        savedSources: [PLAYABLE_SOURCE],
      }),
      'Full track • 3:05',
    );
    assert.equal(
      getSavedPlaylistEntryDetailLabel({
        entry: playlist.items[1],
        savedLoops: [SAVED_LOOP],
        savedSources: [PLAYABLE_SOURCE],
      }),
      'Loop 0:12 - 0:18 • Alto Line.mp3',
    );
  });
});
