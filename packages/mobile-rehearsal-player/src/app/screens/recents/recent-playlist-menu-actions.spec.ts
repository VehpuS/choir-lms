import assert from 'node:assert/strict';
import { describe, it } from 'node:test';

import {
  subscribeToSavedItemRequests,
  type SavedLibraryRequest,
} from '../../library/components/saved-item-menu/saved-item-requests.js';
import { getRecentPlaylistMenuActions } from './recent-playlist-menu-actions.js';

const buildActions = (overrides: { canQueueAsNext?: boolean } = {}) => {
  const calls: string[] = [];
  const actions = getRecentPlaylistMenuActions({
    canQueueAsNext: overrides.canQueueAsNext ?? true,
    isInLibrary: true,
    onClose: () => calls.push('close'),
    onQueuePlaylist: () => calls.push('queue'),
    onViewInLibrary: () => calls.push('view'),
    playlistId: 'playlist-1',
  });

  return { actions, calls };
};

describe('getRecentPlaylistMenuActions', () => {
  it('offers the saved playlist actions plus Queue playlist and View in library', () => {
    const labels = buildActions().actions.map((action) => action.label);

    for (const label of [
      'Add items',
      'Edit tags',
      'Remove from library',
      'Queue playlist',
      'View in library',
    ]) {
      assert.ok(labels.includes(label), `${label} is offered`);
    }
  });

  it('disables Queue playlist while nothing is playing', () => {
    const queue = buildActions({ canQueueAsNext: false }).actions.find(
      (action) => action.label === 'Queue playlist',
    );

    assert.equal(queue?.disabled, true);
  });

  it('closes the menu, then queues the playlist', () => {
    const { actions, calls } = buildActions();

    actions.find((action) => action.label === 'Queue playlist')?.onPress();

    assert.deepEqual(calls, ['close', 'queue']);
  });

  it('asks the Library for the playlist action over the request channel', () => {
    const requests: SavedLibraryRequest[] = [];
    const unsubscribe = subscribeToSavedItemRequests((request) => {
      requests.push(request);
    });
    const { actions } = buildActions();

    actions.find((action) => action.label === 'Edit tags')?.onPress();
    actions.find((action) => action.label === 'Remove from library')?.onPress();
    unsubscribe();

    assert.deepEqual(requests, [
      { action: 'playlist-edit-tags', id: 'playlist-1', kind: 'playlist' },
      { action: 'playlist-remove', id: 'playlist-1', kind: 'playlist' },
    ]);
  });
});
