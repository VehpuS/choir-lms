/// <reference types="node" />

import assert from 'node:assert/strict';
import { describe, it } from 'node:test';

import { getQueueSurfaceTransportActions } from './queue-surface-transport-model.js';

describe('queue surface transport model', () => {
  it('keeps previous and next queue controls visible with disabled state from skip availability', () => {
    assert.deepEqual(
      getQueueSurfaceTransportActions({
        canSkipNextItem: false,
        canSkipPreviousItem: true,
      }),
      [
        {
          accessibilityLabel: 'Previous queue item',
          disabled: false,
          icon: 'skip-previous',
          key: 'previous',
        },
        {
          accessibilityLabel: 'Next queue item',
          disabled: true,
          icon: 'skip-next',
          key: 'next',
        },
      ],
    );
  });
});
