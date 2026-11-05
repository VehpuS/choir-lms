import assert from 'node:assert/strict';
import { afterEach, describe, it } from 'node:test';

import {
  subscribeToSavedItemRequests,
  type SavedItemRequest,
} from '../components/saved-item-menu/saved-item-requests.js';
import {
  createRecordingsMenuState,
  resolveRecordingsMenuActions,
} from './recordings-menu-action.js';

const unsubscribers: Array<() => void> = [];

afterEach(() => {
  unsubscribers.splice(0).forEach((unsubscribe) => unsubscribe());
});

const listen = () => {
  const requests: SavedItemRequest[] = [];

  unsubscribers.push(
    subscribeToSavedItemRequests((request) => requests.push(request)),
  );

  return requests;
};

describe('recordings menu action', () => {
  it('offers nothing where recordings cannot be stored', () => {
    assert.equal(
      createRecordingsMenuState(
        { count: 2, id: 't1', kind: 'track' },
        () => false,
      ),
      undefined,
    );
    assert.deepEqual(resolveRecordingsMenuActions(undefined, 'row'), []);
  });

  it('offers one Recordings action that asks for the panel of a track', () => {
    const requests = listen();
    const state = createRecordingsMenuState(
      { count: 2, id: 't1', kind: 'track' },
      () => true,
    );
    const [action] = resolveRecordingsMenuActions(state, 'row');

    assert.equal(action?.id, 'row:recordings');
    assert.equal(action?.label, 'Recordings');
    assert.equal(action?.meta, '2');

    action?.onPress();

    assert.deepEqual(requests, [
      { action: 'recordings', id: 't1', kind: 'track' },
    ]);
  });

  it('asks for the panel of a loop by its loop id', () => {
    const requests = listen();

    createRecordingsMenuState(
      { count: 1, id: 'loop-1', kind: 'loop' },
      () => true,
    )?.onOpenRecordings();

    assert.deepEqual(requests, [
      { action: 'recordings', id: 'loop-1', kind: 'loop' },
    ]);
  });

  it('leaves the row out when the item has no recordings', () => {
    const state = createRecordingsMenuState(
      { count: 0, id: 't1', kind: 'track' },
      () => true,
    );

    assert.deepEqual(resolveRecordingsMenuActions(state, 'row'), []);
  });
});
