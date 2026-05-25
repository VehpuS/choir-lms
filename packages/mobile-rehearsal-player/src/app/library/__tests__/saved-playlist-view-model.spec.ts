/// <reference types="node" />

import assert from 'node:assert/strict';
import { describe, it } from 'node:test';

import {
  addLoopToPlaylist,
  addTrackToPlaylist,
  createPlaylist,
} from '@org/audio-library-models';

import {
  PLAYABLE_SOURCE,
  SAVED_LOOP,
} from '../../test-utils/library-test-fixtures.js';
import {
  buildPlaylistPlaybackSession,
  getPlaylistPlaybackActionCopy,
  getPlaylistPlaybackCurrentItem,
  getPlaylistPlaybackSessionSummary,
  getPlaylistQueueModeLabel,
  getPlaylistRepeatModeLabel,
  resolvePlaylistPlaybackAdvance,
  updatePlaylistPlaybackRepeatMode,
} from '../utils/saved-playlist-playback-view-model.js';
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

  it('builds playlist playback sessions from saved tracks and loops', () => {
    const queuePlaylist = addLoopToPlaylist(
      addTrackToPlaylist(
        createPlaylist({
          createdAt: '2026-05-12T00:00:00.000Z',
          name: 'Warmups',
          ownerId: 'user-1',
        }),
        PLAYABLE_SOURCE,
        '2026-05-12T00:01:00.000Z',
      ),
      SAVED_LOOP,
      '2026-05-12T00:02:00.000Z',
    );

    const result = buildPlaylistPlaybackSession({
      loops: [SAVED_LOOP],
      mode: 'ordered',
      playlist: queuePlaylist,
      repeatMode: 'all',
      sources: [PLAYABLE_SOURCE],
    });

    assert.equal(result.issue, null);
    assert.deepEqual(result.session && {
      currentItemId: getPlaylistPlaybackCurrentItem(result.session)?.id,
      itemIds: result.session.queue.items.map((item) => item.id),
      mode: result.session.queue.mode,
      repeatMode: result.session.queue.repeatMode,
      requestedItemCount: result.session.requestedItemCount,
      summary: getPlaylistPlaybackSessionSummary(result.session),
    }, {
      currentItemId: 'track:drive:alto-line',
      itemIds: ['track:drive:alto-line', 'loop:loop-1'],
      mode: 'ordered',
      repeatMode: 'all',
      requestedItemCount: 2,
      summary:
        'Active session • Warmups • item 1 of 2 • Ordered • Repeat all.',
    });
  });

  it('advances playlist playback using the shared repeat semantics', () => {
    const queuePlaylist = addLoopToPlaylist(
      addTrackToPlaylist(
        createPlaylist({
          createdAt: '2026-05-12T00:00:00.000Z',
          name: 'Warmups',
          ownerId: 'user-1',
        }),
        PLAYABLE_SOURCE,
        '2026-05-12T00:01:00.000Z',
      ),
      SAVED_LOOP,
      '2026-05-12T00:02:00.000Z',
    );

    const builtSession = buildPlaylistPlaybackSession({
      loops: [SAVED_LOOP],
      mode: 'ordered',
      playlist: queuePlaylist,
      repeatMode: 'off',
      sources: [PLAYABLE_SOURCE],
    }).session;

    if (!builtSession) {
      throw new Error('Expected a playlist playback session.');
    }

    const completedSession = {
      ...builtSession,
      currentIndex: 1,
    };
    const offAdvance = resolvePlaylistPlaybackAdvance(completedSession);
    const repeatOneAdvance = resolvePlaylistPlaybackAdvance(
      updatePlaylistPlaybackRepeatMode(builtSession, 'one'),
    );
    const repeatAllAdvance = resolvePlaylistPlaybackAdvance(
      updatePlaylistPlaybackRepeatMode(completedSession, 'all'),
    );

    assert.equal(offAdvance.nextPlayableItem, null);
    assert.equal(offAdvance.nextSession.hasCompleted, true);
    assert.equal(repeatOneAdvance.nextPlayableItem?.id, 'track:drive:alto-line');
    assert.equal(repeatOneAdvance.nextSession.currentIndex, 0);
    assert.equal(repeatAllAdvance.nextPlayableItem?.id, 'track:drive:alto-line');
    assert.equal(repeatAllAdvance.nextSession.currentIndex, 0);
  });

  it('keeps ordered and shuffled playback controls as fresh start actions', () => {
    const playlist = addTrackToPlaylist(
      createPlaylist({
        createdAt: '2026-05-12T00:00:00.000Z',
        name: 'Warmups',
        ownerId: 'user-1',
      }),
      PLAYABLE_SOURCE,
      '2026-05-12T00:01:00.000Z',
    );
    const activeSession = buildPlaylistPlaybackSession({
      loops: [],
      mode: 'shuffle',
      playlist,
      repeatMode: 'off',
      sources: [PLAYABLE_SOURCE],
    }).session;

    if (!activeSession) {
      throw new Error('Expected an active playlist playback session.');
    }

    assert.deepEqual(
      getPlaylistPlaybackActionCopy({
        activeSession: null,
        isPreparing: false,
        mode: 'ordered',
        playbackState: 'none',
        selectedPlaylist: playlist,
      }),
      {
        disabled: false,
        label: 'Play ordered',
      },
    );
    assert.deepEqual(
      getPlaylistPlaybackActionCopy({
        activeSession,
        isPreparing: false,
        mode: 'shuffle',
        playbackState: 'playing',
        selectedPlaylist: playlist,
      }),
      {
        disabled: false,
        label: 'Shuffle play',
      },
    );
    assert.deepEqual(
      getPlaylistPlaybackActionCopy({
        activeSession: {
          ...activeSession,
          hasCompleted: true,
        },
        isPreparing: false,
        mode: 'shuffle',
        playbackState: 'paused',
        selectedPlaylist: playlist,
      }),
      {
        disabled: false,
        label: 'Shuffle play',
      },
    );
    assert.deepEqual(
      getPlaylistPlaybackActionCopy({
        activeSession,
        isPreparing: false,
        mode: 'ordered',
        playbackState: 'paused',
        selectedPlaylist: playlist,
      }),
      {
        disabled: false,
        label: 'Play ordered',
      },
    );
    assert.equal(getPlaylistQueueModeLabel('shuffle'), 'Shuffle');
    assert.equal(getPlaylistRepeatModeLabel('all'), 'Repeat all');
  });
});
