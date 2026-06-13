/// <reference types="node" />

import assert from 'node:assert/strict';
import { describe, it } from 'node:test';

import {
  clampQueuePosition,
  resolveQueueMoveTargetIndex,
} from '../../../components/queue-move-position-dialog/model.js';
import {
  buildWarmupsPlaylist,
  buildWarmupsQueuePlaylist,
} from './saved-playlist-test-fixtures.js';
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
} from './saved-playlist-detail-view-model.js';

import {
  PLAYABLE_SOURCE,
  SAVED_LOOP,
} from '../../../test-utils/library-test-fixtures.js';

describe('saved playlist detail view-model', () => {
  it('keeps playlist detail draft order and undo feedback in UI-local helpers', () => {
    const playlist = buildWarmupsPlaylist();
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
    const playlist = buildWarmupsPlaylist();
    const reorderedEntries = moveSavedPlaylistDetailEntry(playlist.items, 1, 0);

    assert.equal(
      hasSavedPlaylistDetailEntryOrderChanged(playlist.items, playlist.items),
      false,
    );
    assert.equal(
      hasSavedPlaylistDetailEntryOrderChanged(reorderedEntries, playlist.items),
      true,
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
    const playlist = buildWarmupsQueuePlaylist();
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
});
