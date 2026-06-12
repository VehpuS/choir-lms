/// <reference types="node" />

import assert from 'node:assert/strict';
import { describe, it } from 'node:test';

import {
  addLoopToPlaylist,
  addTrackToPlaylist,
  createLoopPlayableItem,
  createPlaylist,
  createTrackPlayableItem,
} from '@org/audio-library-models';

import {
  clampQueuePosition,
  resolveQueueMoveTargetIndex,
} from '../../components/queue-move-position-model.js';
import {
  PLAYABLE_SOURCE,
  SAVED_LOOP,
} from '../../test-utils/library-test-fixtures.js';
import {
  appendQueueItemsToPlaylist,
  buildSavedPlaylistFromQueue,
} from '../utils/queue-playlist-capture.js';
import {
  buildSavedPlaylistDetailDraftPlaylist,
  getSavedPlaylistDetailInitialState,
  hasSavedPlaylistDetailEntryOrderChanged,
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
  canShowQueuePlaylistActions,
  getPlaylistPlaybackActionCopy,
  getPlaylistPlaybackCurrentItem,
  getPlaylistPlaybackSessionSummary,
  getPlaylistQueueModeLabel,
  getPlaylistRepeatModeLabel,
  movePlaylistPlaybackQueueItem,
  movePlaylistPlaybackQueueItemToEnd,
  movePlaylistPlaybackQueueItemToStart,
  queuePlayableItemAsNext,
  queuePlayableItemAsUpNext,
  queuePlayableItemDuringPlayback,
  removePlaylistPlaybackQueueItem,
  resolvePlaylistPlaybackAdvance,
  resolvePlaylistPlaybackRewind,
  selectPlaylistPlaybackQueueItem,
  updatePlaylistPlaybackRepeatMode,
} from '../utils/saved-playlist-playback-view-model.js';
import { getSavedPlaylistsStatusCopy } from '../utils/saved-playlist-status-view-model.js';
import {
  getPlaylistOptionsMenuActions,
  getSavedPlaylistDetailSummary,
  getSavedPlaylistEntryDetailLabel,
  getSavedPlaylistRemovalCopy,
  resolveSavedPlaylistCards,
  resolveSelectedPlaylist,
} from '../utils/saved-playlist-view-model.js';
import {
  getSavedTrackContextMenuCopy,
  getSavedTrackPlaylistMenuInitialState,
  reduceSavedTrackPlaylistMenuState,
} from '../utils/saved-track-playlist-menu-view-model.js';

const buildThreeItemQueueSession = () => {
  const queuePlaylist = addTrackToPlaylist(
    addLoopToPlaylist(
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
    ),
    {
      ...PLAYABLE_SOURCE,
      id: 'drive:tenor-line',
      name: 'Tenor Line.mp3',
    },
    '2026-05-12T00:03:00.000Z',
  );

  const session = buildPlaylistPlaybackSession({
    loops: [SAVED_LOOP],
    mode: 'ordered',
    playlist: queuePlaylist,
    repeatMode: 'off',
    sources: [
      PLAYABLE_SOURCE,
      {
        ...PLAYABLE_SOURCE,
        id: 'drive:tenor-line',
        name: 'Tenor Line.mp3',
      },
    ],
  }).session;

  if (!session) {
    throw new Error('Expected a playlist playback session.');
  }

  return session;
};

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
    it('appends queue items to an existing playlist in queue order', () => {
      const activePlayableItem = createTrackPlayableItem(PLAYABLE_SOURCE);
      const transientSession = queuePlayableItemDuringPlayback({
        activePlayableItem,
        playableItem: activePlayableItem,
        position: 'up-next',
        repeatMode: 'off',
        session: null,
      });
      const existingPlaylist = addTrackToPlaylist(
        createPlaylist({
          createdAt: '2026-06-04T09:00:00.000Z',
          name: 'Sunday set',
          ownerId: 'user-1',
        }),
        {
          ...PLAYABLE_SOURCE,
          id: 'drive:bass-line',
          name: 'Bass Line.mp3',
        },
        '2026-06-04T09:05:00.000Z',
      );

      const captureResult = appendQueueItemsToPlaylist({
        now: '2026-06-04T10:00:00.000Z',
        playlist: existingPlaylist,
        savedLoops: [],
        savedSources: [],
        session: transientSession,
      });

      assert.equal(captureResult.issue, null);
      assert.deepEqual(
        captureResult.playlist?.items.map((entry) => entry.title),
        ['Bass Line.mp3', 'Alto Line.mp3', 'Alto Line.mp3'],
      );
      assert.deepEqual(
        captureResult.unsavedSources.map((source) => source.id),
        [PLAYABLE_SOURCE.id],
      );
      assert.notEqual(
        captureResult.playlist?.items[1]?.id,
        captureResult.playlist?.items[2]?.id,
      );
    });
    assert.equal(
      resolveSelectedPlaylist([firstPlaylist, secondPlaylist], 'missing')?.id,
      firstPlaylist.id,
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
    const createState = reduceSavedTrackPlaylistMenuState(menuState, {
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
      selectedLoopId: null,
      selectedSourceId: PLAYABLE_SOURCE.id,
      step: 'selector',
    });
    assert.deepEqual(draftedState, {
      draftName: 'Wednesday rehearsal 2',
      selectedLoopId: null,
      selectedSourceId: PLAYABLE_SOURCE.id,
      step: 'create',
    });
    assert.deepEqual(canceledState, {
      draftName: '',
      selectedLoopId: null,
      selectedSourceId: PLAYABLE_SOURCE.id,
      step: 'selector',
    });
    assert.deepEqual(closedState, initialState);
  });

  it('opens playlist selector directly for loop add targets', () => {
    const initialState = getSavedTrackPlaylistMenuInitialState();
    const selectorState = reduceSavedTrackPlaylistMenuState(initialState, {
      type: 'open-loop-selector',
      loopId: SAVED_LOOP.id,
    });

    assert.deepEqual(selectorState, {
      draftName: '',
      selectedLoopId: SAVED_LOOP.id,
      selectedSourceId: null,
      step: 'selector',
    });
  });

  it('keeps playlist detail draft order and undo feedback in UI-local helpers', () => {
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
    const detailState = reduceSavedPlaylistDetailState(initialState, {
      type: 'reset',
      entries: playlist.items,
    });
    const reorderedEntries = moveSavedPlaylistDetailEntry(
      detailState.draftEntries,
      1,
      0,
    );
    const removal = removeSavedPlaylistDetailEntry(reorderedEntries, 'missing');
    const removedTrack = removeSavedPlaylistDetailEntry(
      reorderedEntries,
      playlist.items[0].id,
    );

    assert.deepEqual(
      detailState.draftEntries.map((entry) => entry.id),
      playlist.items.map((entry) => entry.id),
    );
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

  it('detects when playlist draft order diverges from the persisted playlist', () => {
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
    const reorderedEntries = moveSavedPlaylistDetailEntry(playlist.items, 1, 0);

    assert.equal(
      hasSavedPlaylistDetailEntryOrderChanged(playlist.items, playlist.items),
      false,
    );
    assert.equal(
      hasSavedPlaylistDetailEntryOrderChanged(reorderedEntries, playlist.items),
      true,
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

  it('reuses queue move-to-position bounds when reordering playlist drafts', () => {
    const playlist = addLoopToPlaylist(
      addTrackToPlaylist(
        addTrackToPlaylist(
          createPlaylist({
            createdAt: '2026-05-12T00:00:00.000Z',
            name: 'Warmups',
            ownerId: 'user-1',
          }),
          PLAYABLE_SOURCE,
          '2026-05-12T00:01:00.000Z',
        ),
        {
          ...PLAYABLE_SOURCE,
          id: 'source-2',
          name: 'Tenor Line.mp3',
        },
        '2026-05-12T00:01:30.000Z',
      ),
      SAVED_LOOP,
      '2026-05-12T00:02:00.000Z',
    );

    const firstTargetIndex = resolveQueueMoveTargetIndex({
      itemCount: playlist.items.length,
      sliderValue: -4,
    });
    const middleTargetIndex = resolveQueueMoveTargetIndex({
      itemCount: playlist.items.length,
      sliderValue: [2],
    });
    const lastTargetIndex = resolveQueueMoveTargetIndex({
      itemCount: playlist.items.length,
      sliderValue: 99,
    });

    assert.equal(clampQueuePosition(-4, playlist.items.length), 1);
    assert.equal(clampQueuePosition(99, playlist.items.length), 3);
    assert.deepEqual(
      moveSavedPlaylistDetailEntry(playlist.items, 1, firstTargetIndex).map(
        (entry) => entry.id,
      ),
      [playlist.items[1].id, playlist.items[0].id, playlist.items[2].id],
    );
    assert.deepEqual(
      moveSavedPlaylistDetailEntry(playlist.items, 0, middleTargetIndex).map(
        (entry) => entry.id,
      ),
      [playlist.items[1].id, playlist.items[0].id, playlist.items[2].id],
    );
    assert.deepEqual(
      moveSavedPlaylistDetailEntry(playlist.items, 0, lastTargetIndex).map(
        (entry) => entry.id,
      ),
      [playlist.items[1].id, playlist.items[2].id, playlist.items[0].id],
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

  it('includes remove in shared playlist overflow actions when requested', () => {
    const actions = getPlaylistOptionsMenuActions({
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
          id: 'rename-playlist',
          label: 'Rename playlist',
          tone: 'primary',
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

  it('appends Add to queue items to the end of the queue', () => {
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

    const appendedTrack = {
      ...builtSession.queue.items[0],
      id: 'track:drive:tenor-line',
      sourceId: 'drive:tenor-line',
      title: 'Tenor Line.mp3',
      playlistEntryId: undefined,
    };
    const queuedSession = queuePlayableItemAsUpNext(
      builtSession,
      appendedTrack,
    );

    assert.equal(queuedSession.currentIndex, builtSession.currentIndex);
    assert.equal(queuedSession.queue.items[0]?.id, 'track:drive:alto-line');
    assert.equal(queuedSession.queue.items[1]?.id, 'loop:loop-1');
    assert.equal(queuedSession.queue.items[2]?.id, 'track:drive:tenor-line');
    assert.equal(queuedSession.requestedItemCount, 3);
  });

  it('promotes standalone playback into a transient queue for Play next', () => {
    const activePlayableItem = createTrackPlayableItem(PLAYABLE_SOURCE);
    const queuedTrack = {
      ...activePlayableItem,
      id: 'track:drive:soprano-line',
      sourceId: 'drive:soprano-line',
      title: 'Soprano Line.mp3',
    };

    const queuedSession = queuePlayableItemDuringPlayback({
      activePlayableItem,
      playableItem: queuedTrack,
      position: 'next',
      repeatMode: 'one',
      session: null,
    });

    assert.equal(queuedSession?.currentIndex, 0);
    assert.equal(queuedSession?.playlistId, 'transient-queue');
    assert.equal(queuedSession?.playlistName, 'Current queue');
    assert.equal(queuedSession?.queue.repeatMode, 'one');
    assert.equal(queuedSession?.queue.items[0]?.id, activePlayableItem.id);
    assert.equal(queuedSession?.queue.items[1]?.id, queuedTrack.id);
    assert.equal(queuedSession?.requestedItemCount, 2);
  });

  it('shows queue playlist actions for both transient and playlist-backed sessions', () => {
    const transientSession = queuePlayableItemDuringPlayback({
      activePlayableItem: createTrackPlayableItem(PLAYABLE_SOURCE),
      playableItem: createTrackPlayableItem({
        ...PLAYABLE_SOURCE,
        id: 'drive:tenor-line',
        name: 'Tenor Line.mp3',
      }),
      position: 'next',
      repeatMode: 'off',
      session: null,
    });
    const playlistSession = buildPlaylistPlaybackSession({
      loops: [],
      mode: 'ordered',
      playlist: addTrackToPlaylist(
        createPlaylist({
          createdAt: '2026-05-12T00:00:00.000Z',
          name: 'Warmups',
          ownerId: 'user-1',
        }),
        PLAYABLE_SOURCE,
        '2026-05-12T00:01:00.000Z',
      ),
      repeatMode: 'off',
      sources: [PLAYABLE_SOURCE],
    }).session;

    assert.equal(canShowQueuePlaylistActions(null), false);
    assert.equal(canShowQueuePlaylistActions(transientSession), true);
    assert.equal(canShowQueuePlaylistActions(playlistSession), true);
  });

  it('returns null when queue actions run without an active item or queue session', () => {
    const queuedSession = queuePlayableItemDuringPlayback({
      activePlayableItem: null,
      playableItem: createTrackPlayableItem(PLAYABLE_SOURCE),
      position: 'up-next',
      repeatMode: 'off',
      session: null,
    });

    assert.equal(queuedSession, null);
  });

  it('reorders non-current queue items without losing the active item', () => {
    const builtSession = {
      ...buildThreeItemQueueSession(),
      currentIndex: 1,
    };

    const movedSession = movePlaylistPlaybackQueueItem(builtSession, 0, 2);

    assert.equal(movedSession.currentIndex, 0);
    assert.equal(
      getPlaylistPlaybackCurrentItem(movedSession)?.id,
      'loop:loop-1',
    );
    assert.deepEqual(
      movedSession.queue.items.map((item) => item.id),
      ['loop:loop-1', 'track:drive:tenor-line', 'track:drive:alto-line'],
    );
  });

  it('moves the active queue item to the start or end and updates currentIndex', () => {
    const builtSession = buildThreeItemQueueSession();
    const movedToEndSession = movePlaylistPlaybackQueueItemToEnd(
      builtSession,
      0,
    );
    const movedToStartSession = movePlaylistPlaybackQueueItemToStart(
      {
        ...builtSession,
        currentIndex: 2,
      },
      2,
    );

    assert.equal(movedToEndSession.currentIndex, 2);
    assert.equal(
      getPlaylistPlaybackCurrentItem(movedToEndSession)?.id,
      'track:drive:alto-line',
    );
    assert.deepEqual(
      movedToEndSession.queue.items.map((item) => item.id),
      ['loop:loop-1', 'track:drive:tenor-line', 'track:drive:alto-line'],
    );
    assert.equal(movedToStartSession.currentIndex, 0);
    assert.equal(
      getPlaylistPlaybackCurrentItem(movedToStartSession)?.id,
      'track:drive:tenor-line',
    );
  });

  it('removes non-current queue items and keeps current-row removal stable', () => {
    const builtSession = {
      ...buildThreeItemQueueSession(),
      currentIndex: 1,
    };
    const removedSession = removePlaylistPlaybackQueueItem(builtSession, 2);
    const unchangedSession = removePlaylistPlaybackQueueItem(builtSession, 1);

    assert.equal(removedSession.currentIndex, 1);
    assert.equal(removedSession.requestedItemCount, 2);
    assert.deepEqual(
      removedSession.queue.items.map((item) => item.id),
      ['track:drive:alto-line', 'loop:loop-1'],
    );
    assert.equal(unchangedSession, builtSession);
  });

  it('selects a queue item for direct playback without changing queue order', () => {
    const builtSession = buildThreeItemQueueSession();
    const selection = selectPlaylistPlaybackQueueItem(builtSession, 2);

    assert.equal(selection.nextSession.currentIndex, 2);
    assert.equal(selection.nextSession.hasCompleted, false);
    assert.equal(selection.playableItem?.id, 'track:drive:tenor-line');
    assert.deepEqual(
      selection.nextSession.queue.items.map((item) => item.id),
      builtSession.queue.items.map((item) => item.id),
    );
  });

  it('captures queue items into a playlist and deduplicates unsaved repeated tracks', () => {
    const activePlayableItem = createTrackPlayableItem(PLAYABLE_SOURCE);
    const transientSession = queuePlayableItemDuringPlayback({
      activePlayableItem,
      playableItem: activePlayableItem,
      position: 'up-next',
      repeatMode: 'off',
      session: null,
    });

    const captureResult = buildSavedPlaylistFromQueue({
      name: 'Warmup queue',
      now: '2026-06-04T10:00:00.000Z',
      ownerId: 'user-1',
      savedLoops: [],
      savedSources: [],
      session: transientSession,
    });

    assert.equal(captureResult.issue, null);
    assert.equal(captureResult.playlist?.items.length, 2);
    assert.equal(captureResult.playlist?.items[0]?.title, 'Alto Line.mp3');
    assert.equal(captureResult.playlist?.items[1]?.title, 'Alto Line.mp3');
    assert.notEqual(
      captureResult.playlist?.items[0]?.id,
      captureResult.playlist?.items[1]?.id,
    );
    assert.deepEqual(
      captureResult.unsavedSources.map((source) => source.id),
      [PLAYABLE_SOURCE.id],
    );
  });

  it('reports an issue when queued loop items cannot be resolved during queue capture', () => {
    const transientSession = queuePlayableItemDuringPlayback({
      activePlayableItem: createTrackPlayableItem(PLAYABLE_SOURCE),
      playableItem: createLoopPlayableItem(SAVED_LOOP, PLAYABLE_SOURCE),
      position: 'next',
      repeatMode: 'off',
      session: null,
    });

    const captureResult = buildSavedPlaylistFromQueue({
      name: 'Warmup queue',
      now: '2026-06-04T10:00:00.000Z',
      ownerId: 'user-1',
      savedLoops: [],
      savedSources: [PLAYABLE_SOURCE],
      session: transientSession,
    });

    assert.deepEqual(captureResult, {
      issue: {
        title: 'Queued loop unavailable',
        message:
          'The queue item "Entrance cue" no longer has a saved loop source. Remove it from Up Next before saving this playlist.',
      },
      playlist: null,
      unsavedSources: [],
    });
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
