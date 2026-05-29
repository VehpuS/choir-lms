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
  buildSavedPlaylistDetailDraftPlaylist,
  getSavedPlaylistDetailInitialState,
  isSavedPlaylistEntryPlayable,
  moveSavedPlaylistDetailEntry,
  reduceSavedPlaylistDetailState,
  removeSavedPlaylistDetailEntry,
  resolveSavedPlaylistDetailDragTargetIndex,
  resolveSavedPlaylistDetailEdgeAutoscrollDelta,
  restoreSavedPlaylistDetailEntry,
} from '../utils/saved-playlist-detail-view-model.js';
import {
  buildPlaylistPlaybackSession,
  getPlaylistPlaybackActionCopy,
  getPlaylistPlaybackCurrentItem,
  getPlaylistPlaybackSessionSummary,
  getPlaylistQueueModeLabel,
  getPlaylistRepeatModeLabel,
  queuePlayableItemAsNext,
  resolvePlaylistPlaybackAdvance,
  resolvePlaylistPlaybackRewind,
  updatePlaylistPlaybackRepeatMode,
} from '../utils/saved-playlist-playback-view-model.js';
import { getSavedPlaylistsStatusCopy } from '../utils/saved-playlist-status-view-model.js';
import {
  getSavedPlaylistDetailSummary,
  getSavedPlaylistEntryDetailLabel,
  getSavedPlaylistLibraryActionCopy,
  getSavedPlaylistRemovalCopy,
  resolveSavedPlaylistCards,
  resolveSelectedPlaylist,
} from '../utils/saved-playlist-view-model.js';
import {
  getSavedTrackContextMenuCopy,
  getSavedTrackPlaylistMenuInitialState,
  reduceSavedTrackPlaylistMenuState,
} from '../utils/saved-track-playlist-menu-view-model.js';

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

  it('keeps empty playlist status focused on the running-order job', () => {
    assert.deepEqual(
      getSavedPlaylistsStatusCopy({
        isLoading: false,
        issue: null,
        savedPlaylistCount: 0,
      }),
      {
        title: 'No playlists yet',
        message:
          'Create a playlist, then add saved tracks or loops from Library to build a rehearsal running order.',
        tone: 'neutral',
      },
    );
  });

  it('tracks the saved track playlist menu flow in UI-local state', () => {
    const initialState = getSavedTrackPlaylistMenuInitialState();
    const menuState = reduceSavedTrackPlaylistMenuState(initialState, {
      type: 'open',
      sourceId: PLAYABLE_SOURCE.id,
    });
    const selectorState = reduceSavedTrackPlaylistMenuState(menuState, {
      type: 'open-selector',
    });
    const createState = reduceSavedTrackPlaylistMenuState(selectorState, {
      type: 'open-create',
    });
    const draftedState = reduceSavedTrackPlaylistMenuState(createState, {
      type: 'update-draft',
      value: 'Wednesday rehearsal 2',
    });
    const canceledState = reduceSavedTrackPlaylistMenuState(draftedState, {
      type: 'cancel-create',
    });
    const closedState = reduceSavedTrackPlaylistMenuState(canceledState, {
      type: 'close',
    });

    assert.deepEqual(menuState, {
      draftName: '',
      selectedSourceId: PLAYABLE_SOURCE.id,
      step: 'menu',
    });
    assert.deepEqual(selectorState, {
      draftName: '',
      selectedSourceId: PLAYABLE_SOURCE.id,
      step: 'selector',
    });
    assert.deepEqual(draftedState, {
      draftName: 'Wednesday rehearsal 2',
      selectedSourceId: PLAYABLE_SOURCE.id,
      step: 'create',
    });
    assert.deepEqual(canceledState, {
      draftName: '',
      selectedSourceId: PLAYABLE_SOURCE.id,
      step: 'selector',
    });
    assert.deepEqual(closedState, initialState);
  });

  it('keeps playlist detail edit state and undo feedback in UI-local helpers', () => {
    const playlist = addLoopToPlaylist(
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
    const initialState = getSavedPlaylistDetailInitialState();
    const editingState = reduceSavedPlaylistDetailState(initialState, {
      type: 'enter-edit-mode',
      entries: playlist.items,
    });
    const reorderedEntries = moveSavedPlaylistDetailEntry(
      editingState.draftEntries,
      1,
      0,
    );
    const removal = removeSavedPlaylistDetailEntry(reorderedEntries, 'missing');
    const removedTrack = removeSavedPlaylistDetailEntry(
      reorderedEntries,
      playlist.items[0].id,
    );

    assert.equal(editingState.isEditing, true);
    assert.deepEqual(
      reorderedEntries.map((entry) => entry.id),
      [playlist.items[1].id, playlist.items[0].id],
    );
    assert.equal(removal, null);

    if (!removedTrack) {
      throw new Error('Expected a removed track snapshot.');
    }

    assert.deepEqual(
      restoreSavedPlaylistDetailEntry(removedTrack.nextEntries, {
        entry: removedTrack.entry,
        previousIndex: removedTrack.previousIndex,
      }).map((entry) => entry.id),
      [playlist.items[1].id, playlist.items[0].id],
    );
    assert.deepEqual(
      buildSavedPlaylistDetailDraftPlaylist(
        playlist,
        reorderedEntries,
      ).items.map((entry) => ({
        id: entry.id,
        sortIndex: entry.sortIndex,
      })),
      [
        {
          id: playlist.items[1].id,
          sortIndex: 0,
        },
        {
          id: playlist.items[0].id,
          sortIndex: 1,
        },
      ],
    );
  });

  it('resolves drag reorder targets from row distance with clamped bounds', () => {
    assert.equal(
      resolveSavedPlaylistDetailDragTargetIndex({
        deltaY: 18,
        fromIndex: 2,
        itemCount: 5,
      }),
      2,
    );
    assert.equal(
      resolveSavedPlaylistDetailDragTargetIndex({
        deltaY: 62,
        fromIndex: 2,
        itemCount: 5,
      }),
      3,
    );
    assert.equal(
      resolveSavedPlaylistDetailDragTargetIndex({
        deltaY: -112,
        fromIndex: 2,
        itemCount: 5,
      }),
      0,
    );
    assert.equal(
      resolveSavedPlaylistDetailDragTargetIndex({
        deltaY: -24,
        fromIndex: 2,
        itemCount: 5,
      }),
      2,
    );
    assert.equal(
      resolveSavedPlaylistDetailDragTargetIndex({
        deltaY: -36,
        fromIndex: 2,
        itemCount: 5,
      }),
      1,
    );
    assert.equal(
      resolveSavedPlaylistDetailDragTargetIndex({
        deltaY: 500,
        fromIndex: 2,
        itemCount: 5,
      }),
      4,
    );
  });

  it('scales edge auto-scroll speed by proximity to viewport edges', () => {
    assert.equal(
      resolveSavedPlaylistDetailEdgeAutoscrollDelta({
        moveY: 400,
        viewportHeight: 800,
      }),
      0,
    );
    assert.ok(
      resolveSavedPlaylistDetailEdgeAutoscrollDelta({
        moveY: 20,
        viewportHeight: 800,
      }) <
        resolveSavedPlaylistDetailEdgeAutoscrollDelta({
          moveY: 80,
          viewportHeight: 800,
        }),
    );
    assert.ok(
      resolveSavedPlaylistDetailEdgeAutoscrollDelta({
        moveY: 780,
        viewportHeight: 800,
      }) >
        resolveSavedPlaylistDetailEdgeAutoscrollDelta({
          moveY: 730,
          viewportHeight: 800,
        }),
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

  it('builds track context sheet copy without repeating the location label', () => {
    assert.deepEqual(
      getSavedTrackContextMenuCopy({
        ...PLAYABLE_SOURCE,
        locationLabel: 'Spring Concert / Alto folder',
      }),
      {
        detailLabel: 'Saved track • MP3 • 3:05',
        locationLabel: 'Spring Concert / Alto folder',
        title: 'Alto Line.mp3',
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

  it('builds dedicated playlist detail copy and item labels', () => {
    const playlist = addLoopToPlaylist(
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
    const session = buildPlaylistPlaybackSession({
      loops: [SAVED_LOOP],
      mode: 'ordered',
      playlist,
      repeatMode: 'all',
      sources: [PLAYABLE_SOURCE],
    }).session;

    if (!session) {
      throw new Error('Expected a playlist session.');
    }

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
    assert.equal(
      isSavedPlaylistEntryPlayable({
        entry: playlist.items[0],
        savedLoops: [SAVED_LOOP],
        savedSources: [PLAYABLE_SOURCE],
      }),
      true,
    );
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
    assert.deepEqual(
      result.session && {
        currentItemId: getPlaylistPlaybackCurrentItem(result.session)?.id,
        itemIds: result.session.queue.items.map((item) => item.id),
        mode: result.session.queue.mode,
        repeatMode: result.session.queue.repeatMode,
        requestedItemCount: result.session.requestedItemCount,
        summary: getPlaylistPlaybackSessionSummary(result.session),
      },
      {
        currentItemId: 'track:drive:alto-line',
        itemIds: ['track:drive:alto-line', 'loop:loop-1'],
        mode: 'ordered',
        repeatMode: 'all',
        requestedItemCount: 2,
        summary:
          'Active session • Warmups • item 1 of 2 • Ordered • Repeat all.',
      },
    );
  });

  it('starts ordered playlist playback from a tapped playlist entry', () => {
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
      repeatMode: 'off',
      sources: [PLAYABLE_SOURCE],
      startEntryId: queuePlaylist.items[1].id,
    });

    assert.equal(result.issue, null);
    assert.equal(result.session?.currentIndex, 1);
    assert.equal(
      result.session && getPlaylistPlaybackCurrentItem(result.session)?.id,
      'loop:loop-1',
    );
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
    assert.equal(
      repeatOneAdvance.nextPlayableItem?.id,
      'track:drive:alto-line',
    );
    assert.equal(repeatOneAdvance.nextSession.currentIndex, 0);
    assert.equal(
      repeatAllAdvance.nextPlayableItem?.id,
      'track:drive:alto-line',
    );
    assert.equal(repeatAllAdvance.nextSession.currentIndex, 0);
  });

  it('rewinds playlist playback using the shared previous-item semantics', () => {
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

    const laterSession = {
      ...builtSession,
      currentIndex: 1,
      hasCompleted: true,
    };
    const offRewind = resolvePlaylistPlaybackRewind(laterSession);
    const repeatAllRewind = resolvePlaylistPlaybackRewind(
      updatePlaylistPlaybackRepeatMode(builtSession, 'all'),
    );

    assert.equal(offRewind.previousPlayableItem?.id, 'track:drive:alto-line');
    assert.equal(offRewind.previousSession.currentIndex, 0);
    assert.equal(offRewind.previousSession.hasCompleted, false);
    assert.equal(repeatAllRewind.previousPlayableItem?.id, 'loop:loop-1');
    assert.equal(repeatAllRewind.previousSession.currentIndex, 1);
  });

  it('inserts Play next items directly after the active queue item', () => {
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

    const currentItem = getPlaylistPlaybackCurrentItem(builtSession);

    if (!currentItem) {
      throw new Error('Expected an active queue item.');
    }

    const insertedTrack = {
      ...currentItem,
      id: 'track:drive:soprano-line',
      sourceId: 'drive:soprano-line',
      title: 'Soprano Line.mp3',
      playlistEntryId: undefined,
    };

    const queuedSession = queuePlayableItemAsNext(builtSession, insertedTrack);

    assert.equal(queuedSession.currentIndex, builtSession.currentIndex);
    assert.equal(queuedSession.queue.items[0]?.id, 'track:drive:alto-line');
    assert.equal(queuedSession.queue.items[1]?.id, 'track:drive:soprano-line');
    assert.equal(queuedSession.queue.items[2]?.id, 'loop:loop-1');
    assert.equal(queuedSession.requestedItemCount, 3);
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
