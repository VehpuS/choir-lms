import assert from 'node:assert/strict';
import { describe, it } from 'node:test';

import { keepScreenAwake } from './keep-screen-awake.js';

describe('best-effort keep awake', () => {
  it('activates on start and deactivates on release, by tag', async () => {
    const calls: string[] = [];
    const release = keepScreenAwake('viewer', {
      activate: async (tag) => {
        calls.push(`on ${tag}`);
      },
      deactivate: async (tag) => {
        calls.push(`off ${tag}`);
      },
    });

    release();

    assert.deepEqual(calls, ['on viewer', 'off viewer']);
  });

  it('ignores a refused wake lock and the release that follows it', async () => {
    const unhandled: unknown[] = [];
    const onUnhandled = (reason: unknown) => {
      unhandled.push(reason);
    };

    process.on('unhandledRejection', onUnhandled);

    try {
      const release = keepScreenAwake('viewer', {
        activate: () => Promise.reject(new Error('NotAllowedError')),
        deactivate: () => Promise.reject(new Error('not activated yet')),
      });

      release();
      // Unhandled rejections surface after the microtask queue drains.
      await new Promise((resolve) => setTimeout(resolve, 10));
    } finally {
      process.off('unhandledRejection', onUnhandled);
    }

    assert.deepEqual(unhandled, []);
  });
});
