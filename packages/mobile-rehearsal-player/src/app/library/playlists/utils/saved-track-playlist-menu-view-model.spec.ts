/// <reference types="node" />

import assert from 'node:assert/strict';
import { describe, it } from 'node:test';

import {
  PLAYABLE_SOURCE,
  SAVED_LOOP,
} from '../../../test-utils/library-test-fixtures.js';
import {
  getSavedTrackContextMenuCopy,
  getSavedTrackPlaylistMenuInitialState,
  reduceSavedTrackPlaylistMenuState,
} from './saved-track-playlist-menu-view-model.js';

describe('saved track playlist menu view-model', () => {
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

  it('builds track context sheet copy without repeating the location label', () => {
    assert.deepEqual(
      getSavedTrackContextMenuCopy({
        ...PLAYABLE_SOURCE,
        locationLabel: 'Spring Concert / Alto folder',
      }),
      {
        detailLabel: 'Saved track • 3:05',
        locationLabel: 'Spring Concert / Alto folder',
        title: 'Alto Line.mp3',
      },
    );
  });
});
