/// <reference types="node" />

import assert from 'node:assert/strict';
import { describe, it } from 'node:test';

import { getPlaylistDetailRowControlState } from './playlist-detail-row-controls-model.js';

describe('playlist detail row controls model', () => {
  it('keeps default-visible row controls active and overflow actions ordered by frequency', () => {
    const state = getPlaylistDetailRowControlState({
      entryId: 'playlist-entry-2',
      entryTitle: 'Alto Line.mp3',
      index: 1,
      isCurrentEntry: false,
      isItemPlayable: true,
      isMutating: false,
      itemCount: 3,
      playbackToggleDisabled: false,
      playbackToggleLabel: 'Pause',
    });

    assert.equal(state.canDragReorder, true);
    assert.equal(state.canMoveUp, true);
    assert.equal(state.canMoveDown, true);
    assert.equal(state.isPlaybackButtonDisabled, false);
    assert.equal(state.rowStatusLabel, 'Ready');
    assert.deepEqual(state.playbackAction, {
      accessibilityLabel: 'Play Alto Line.mp3',
      iconName: 'play',
      pressBehavior: 'play-item',
    });
    assert.deepEqual(
      state.menuActions.map((action) => ({
        disabled: action.disabled ?? false,
        id: action.id,
        kind: action.kind,
        label: action.label,
        tone: action.tone,
      })),
      [
        {
          disabled: false,
          id: 'playlist-entry-2:move-to-position',
          kind: 'move-to-position',
          label: 'Move to position',
          tone: undefined,
        },
        {
          disabled: false,
          id: 'playlist-entry-2:remove',
          kind: 'remove',
          label: 'Remove from playlist',
          tone: 'destructive',
        },
      ],
    );
  });

  it('keeps current-row status copy aligned with playback state', () => {
    assert.equal(
      getPlaylistDetailRowControlState({
        entryId: 'playlist-entry-1',
        entryTitle: 'Entrance cue',
        index: 0,
        isCurrentEntry: true,
        isItemPlayable: true,
        isMutating: false,
        itemCount: 2,
        playbackToggleDisabled: false,
        playbackToggleLabel: 'Pause',
      }).rowStatusLabel,
      'Playing',
    );
    assert.equal(
      getPlaylistDetailRowControlState({
        entryId: 'playlist-entry-1',
        entryTitle: 'Entrance cue',
        index: 0,
        isCurrentEntry: true,
        isItemPlayable: true,
        isMutating: false,
        itemCount: 2,
        playbackToggleDisabled: false,
        playbackToggleLabel: 'Resume',
      }).rowStatusLabel,
      'Current',
    );
  });

  it('disables move and playback controls when the row is unavailable or mutating', () => {
    const state = getPlaylistDetailRowControlState({
      entryId: 'playlist-entry-1',
      entryTitle: 'Unavailable cue',
      index: 0,
      isCurrentEntry: false,
      isItemPlayable: false,
      isMutating: true,
      itemCount: 1,
      playbackToggleDisabled: false,
      playbackToggleLabel: 'Pause',
    });

    assert.equal(state.canDragReorder, false);
    assert.equal(state.canMoveUp, false);
    assert.equal(state.canMoveDown, false);
    assert.equal(state.isPlaybackButtonDisabled, true);
    assert.equal(state.rowStatusLabel, 'Unavailable');
    assert.deepEqual(
      state.menuActions.map((action) => ({
        disabled: action.disabled ?? false,
        kind: action.kind,
      })),
      [
        {
          disabled: true,
          kind: 'move-to-position',
        },
        {
          disabled: true,
          kind: 'remove',
        },
      ],
    );
  });
});
