import assert from 'node:assert/strict';
import { describe, it } from 'node:test';

import {
  QUEUE_NEEDS_PLAYBACK_REASON,
  assembleBulkActions,
} from './bulk-action-assembly';
import { resolveBulkActions } from './bulk-action-resolution';

const resolved = resolveBulkActions({
  effectivePlayableCount: 2,
  items: [{ entityId: 't1', key: 'a', kind: 'track' }],
  surface: 'tracks',
});

describe('assembleBulkActions', () => {
  it('leaves actions without a handler off the bar and keeps the resolved order', () => {
    const actions = assembleBulkActions({
      canQueue: true,
      handlers: {
        'add-to-playlist': () => undefined,
        'play-next': () => undefined,
      },
      resolved,
    });

    assert.deepEqual(
      actions.map(({ id }) => id),
      ['play-next', 'add-to-playlist'],
    );
  });

  it('disables the queue actions, with a reason, while nothing is playing', () => {
    const actions = assembleBulkActions({
      canQueue: false,
      handlers: {
        'add-to-playlist': () => undefined,
        'add-to-queue': () => undefined,
        'play-next': () => undefined,
      },
      resolved,
    });

    assert.deepEqual(
      actions.map(({ id, isDisabled }) => [id, isDisabled]),
      [
        ['play-next', true],
        ['add-to-queue', true],
        ['add-to-playlist', false],
      ],
    );
    assert.equal(actions[0].disabledReason, QUEUE_NEEDS_PLAYBACK_REASON);
  });

  it('carries the resolution reason when the selection cannot play', () => {
    const actions = assembleBulkActions({
      canQueue: true,
      handlers: { 'play-next': () => undefined },
      resolved: resolveBulkActions({
        effectivePlayableCount: 0,
        items: [{ folderId: 'f', key: 'f', kind: 'folder' }],
        surface: 'files',
      }),
    });

    assert.equal(actions[0].isDisabled, true);
    assert.equal(
      actions[0].disabledReason,
      'This selection has no tracks or loops to play.',
    );
  });
});
