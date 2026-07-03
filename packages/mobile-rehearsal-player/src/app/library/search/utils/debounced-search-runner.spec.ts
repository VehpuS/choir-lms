/// <reference types="node" />

import assert from 'node:assert/strict';
import { describe, it } from 'node:test';

import { createDebouncedSearchRunner } from './debounced-search-runner.js';

const waitForMs = async (durationMs: number) => {
  await new Promise<void>((resolve) => {
    setTimeout(resolve, durationMs);
  });
};

describe('debouncedSearchRunner', () => {
  it('runs scheduled search once after the debounce window', async () => {
    const calls: string[] = [];
    const runner = createDebouncedSearchRunner({
      debounceMs: 30,
      runSearch(query) {
        calls.push(query);
      },
    });

    runner.schedule('a');

    assert.deepEqual(calls, []);

    await waitForMs(60);

    assert.deepEqual(calls, ['a']);
  });

  it('flushes pending work immediately without leaving trailing calls behind', async () => {
    const calls: string[] = [];
    const runner = createDebouncedSearchRunner({
      debounceMs: 30,
      runSearch(query) {
        calls.push(query);
      },
    });

    runner.schedule('al');
    runner.flush('alto');

    assert.deepEqual(calls, ['alto']);

    await waitForMs(60);

    assert.deepEqual(calls, ['alto']);
  });

  it('cancels a pending scheduled search', async () => {
    const calls: string[] = [];
    const runner = createDebouncedSearchRunner({
      debounceMs: 30,
      runSearch(query) {
        calls.push(query);
      },
    });

    runner.schedule('tenor');
    runner.cancel();

    await waitForMs(60);

    assert.deepEqual(calls, []);
  });
});
