import assert from 'node:assert/strict';
import { beforeEach, describe, it } from 'node:test';

import {
  createWakeLockCoordinator,
  type WakeLockEnvironment,
  type WakeLockSentinelLike,
} from './wake-lock-coordinator';

const flush = () => new Promise<void>((resolve) => setImmediate(resolve));

const createFakeBrowser = () => {
  const state = {
    becameVisible: () => undefined as void,
    granted: [] as { isReleased: boolean; fireRelease: () => void }[],
    isVisible: true,
    shouldRefuse: false,
  };
  const environment: WakeLockEnvironment = {
    isVisible: () => state.isVisible,
    onBecameVisible: (listener) => {
      state.becameVisible = listener;
    },
    request: async () => {
      if (state.shouldRefuse) {
        throw new Error('NotAllowedError');
      }

      let onRelease = () => undefined as void;
      const lock = {
        isReleased: false,
        fireRelease: () => onRelease(),
      };
      const sentinel: WakeLockSentinelLike = {
        addEventListener: (_type, listener) => {
          onRelease = listener;
        },
        release: async () => {
          lock.isReleased = true;
        },
      };

      state.granted.push(lock);

      return sentinel;
    },
  };

  return { environment, state };
};

describe('createWakeLockCoordinator', () => {
  let browser: ReturnType<typeof createFakeBrowser>;

  beforeEach(() => {
    browser = createFakeBrowser();
  });

  it('takes one lock for any number of holders and lets go with the last', async () => {
    const coordinator = createWakeLockCoordinator(browser.environment);
    const releasePlayback = coordinator.hold();
    const releaseScore = coordinator.hold();

    await flush();
    assert.equal(browser.state.granted.length, 1);

    releasePlayback();
    assert.equal(browser.state.granted[0].isReleased, false);

    releaseScore();
    assert.equal(browser.state.granted[0].isReleased, true);
  });

  it('asks again when the page returns after the browser dropped the lock', async () => {
    const coordinator = createWakeLockCoordinator(browser.environment);

    coordinator.hold();
    await flush();
    browser.state.granted[0].fireRelease();
    browser.state.becameVisible();
    await flush();

    assert.equal(browser.state.granted.length, 2);
  });

  it('does not ask while the page is hidden, but does on return', async () => {
    browser.state.isVisible = false;

    const coordinator = createWakeLockCoordinator(browser.environment);

    coordinator.hold();
    await flush();
    assert.equal(browser.state.granted.length, 0);

    browser.state.isVisible = true;
    browser.state.becameVisible();
    await flush();
    assert.equal(browser.state.granted.length, 1);
  });

  it('does not ask again while it still holds a lock', async () => {
    const coordinator = createWakeLockCoordinator(browser.environment);

    coordinator.hold();
    await flush();
    browser.state.becameVisible();
    await flush();

    assert.equal(browser.state.granted.length, 1);
  });

  it('treats a refusal as nothing to do', async () => {
    browser.state.shouldRefuse = true;

    const coordinator = createWakeLockCoordinator(browser.environment);
    const release = coordinator.hold();

    await flush();
    release();

    assert.equal(browser.state.granted.length, 0);
  });

  it('lets go of a lock granted after everyone had left', async () => {
    const coordinator = createWakeLockCoordinator(browser.environment);

    coordinator.hold()();
    await flush();

    assert.equal(browser.state.granted.length, 1);
    assert.equal(browser.state.granted[0].isReleased, true);
  });

  it('is a no-op where the browser has no wake lock API', async () => {
    const coordinator = createWakeLockCoordinator({
      ...browser.environment,
      request: undefined,
    });

    coordinator.hold()();
    await flush();

    assert.equal(browser.state.granted.length, 0);
  });

  it('lets a holder let go only once', async () => {
    const coordinator = createWakeLockCoordinator(browser.environment);
    const releaseFirst = coordinator.hold();

    coordinator.hold();
    await flush();
    releaseFirst();
    releaseFirst();

    assert.equal(browser.state.granted[0].isReleased, false);
  });
});
