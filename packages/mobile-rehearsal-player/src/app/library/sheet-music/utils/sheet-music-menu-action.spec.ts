import assert from 'node:assert/strict';
import { afterEach, describe, it } from 'node:test';

import {
  subscribeToSavedItemRequests,
  type SavedItemRequest,
} from '../../components/saved-item-menu/saved-item-requests';
import {
  createSheetMusicMenuState,
  resolveSheetMusicMenuActions,
} from './sheet-music-menu-action';

describe('resolveSheetMusicMenuActions', () => {
  it('offers nothing where sheet music is not offered', () => {
    assert.deepEqual(resolveSheetMusicMenuActions(undefined, 'track'), []);
  });

  it('offers one secondary Sheet music action that opens the manager', () => {
    let opened = 0;
    const [action, ...rest] = resolveSheetMusicMenuActions(
      {
        onOpenSheetMusic: () => {
          opened += 1;
        },
      },
      'track',
    );

    assert.equal(rest.length, 0);
    assert.equal(action?.id, 'track:sheet-music');
    assert.equal(action?.label, 'Sheet music');
    assert.equal(action?.tone, 'secondary');
    action?.onPress();
    assert.equal(opened, 1);
  });
});

describe('createSheetMusicMenuState', () => {
  let unsubscribe: (() => void) | undefined;

  afterEach(() => {
    unsubscribe?.();
  });

  it('asks the request channel to open sheet music for the track or loop', () => {
    const requests: SavedItemRequest[] = [];

    unsubscribe = subscribeToSavedItemRequests((request) => {
      requests.push(request);
    });
    createSheetMusicMenuState({
      id: 'drive:a',
      kind: 'track',
    }).onOpenSheetMusic();
    createSheetMusicMenuState({
      id: 'loop-1',
      kind: 'loop',
    }).onOpenSheetMusic();

    assert.deepEqual(requests, [
      { action: 'sheet-music', id: 'drive:a', kind: 'track' },
      { action: 'sheet-music', id: 'loop-1', kind: 'loop' },
    ]);
  });
});
