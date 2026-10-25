/// <reference types="node" />

import assert from 'node:assert/strict';
import { afterEach, describe, it } from 'node:test';

import { createElement } from 'react';
import { act, create } from 'react-test-renderer';

import {
  useHostSizeChange,
  type HostSizeChange,
} from './use-host-size-change.js';

(
  globalThis as { IS_REACT_ACT_ENVIRONMENT?: boolean }
).IS_REACT_ACT_ENVIRONMENT = true;

// Longer than the hook's quiet period.
const SETTLE_MS = 250;
const wait = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));

type ObserverCallback = () => void;
const observers: Array<{ callback: ObserverCallback; isConnected: boolean }> =
  [];

class FakeResizeObserver {
  private readonly entry: { callback: ObserverCallback; isConnected: boolean };

  constructor(callback: ObserverCallback) {
    this.entry = { callback, isConnected: true };
    observers.push(this.entry);
  }

  disconnect() {
    this.entry.isConnected = false;
  }

  observe() {
    // Nothing to measure: the spec calls the callback itself.
  }
}

const setUp = async () => {
  (globalThis as { ResizeObserver?: unknown }).ResizeObserver =
    FakeResizeObserver;
  observers.length = 0;

  const host = { clientHeight: 500, clientWidth: 300 };
  const changes: HostSizeChange[] = [];
  const Probe = () => {
    useHostSizeChange(host, (change) => changes.push(change));

    return null;
  };
  let renderer: ReturnType<typeof create> | undefined;

  await act(async () => {
    renderer = create(createElement(Probe));
  });

  return {
    changes,
    host,
    resize: async () => {
      observers.forEach(
        ({ callback, isConnected }) => isConnected && callback(),
      );
      await wait(SETTLE_MS);
    },
    unmount: async () => {
      await act(async () => {
        renderer?.unmount();
      });
    },
  };
};

describe('useHostSizeChange', () => {
  afterEach(() => {
    delete (globalThis as { ResizeObserver?: unknown }).ResizeObserver;
  });

  it('reports a width change once it has settled, without a height change', async () => {
    const { changes, host, resize } = await setUp();

    host.clientWidth = 500;
    await resize();

    assert.deepEqual(changes, [{ hasHeightChanged: false }]);
  });

  it('reports a height change as such', async () => {
    const { changes, host, resize } = await setUp();

    host.clientHeight = 300;
    await resize();

    assert.deepEqual(changes, [{ hasHeightChanged: true }]);
  });

  it('stays quiet when the size is the same', async () => {
    const { changes, resize } = await setUp();

    await resize();

    assert.deepEqual(changes, []);
  });

  it('reports one change for a burst of resize events', async () => {
    const { changes, host, resize } = await setUp();

    host.clientWidth = 400;
    observers.forEach(({ callback }) => callback());
    observers.forEach(({ callback }) => callback());
    await resize();

    assert.equal(changes.length, 1);
  });

  it('stops observing when unmounted', async () => {
    const { changes, host, resize, unmount } = await setUp();

    await unmount();
    host.clientWidth = 900;
    await resize();

    assert.deepEqual(changes, []);
    assert.equal(
      observers.every(({ isConnected }) => !isConnected),
      true,
    );
  });
});
