import assert from 'node:assert/strict';
import { afterEach, describe, it } from 'node:test';

import { appConnectivity, canTellConnectionType } from './connectivity.web';

type Listener = () => void;
const scope = globalThis as unknown as Record<string, unknown>;
const saved = {
  addEventListener: scope.addEventListener,
  navigator: Object.getOwnPropertyDescriptor(globalThis, 'navigator'),
  removeEventListener: scope.removeEventListener,
};

/** A browser with the given network information, recording its listeners. */
const installBrowser = (navigatorValue: unknown) => {
  const windowListeners = new Map<string, Set<Listener>>();
  const connectionListeners = new Set<Listener>();

  Object.defineProperty(globalThis, 'navigator', {
    configurable: true,
    value: navigatorValue,
  });
  scope.addEventListener = (name: string, listener: Listener) => {
    windowListeners.set(
      name,
      (windowListeners.get(name) ?? new Set()).add(listener),
    );
  };
  scope.removeEventListener = (name: string, listener: Listener) => {
    windowListeners.get(name)?.delete(listener);
  };

  return {
    connectionListeners,
    fire: (name: string) =>
      windowListeners.get(name)?.forEach((listener) => listener()),
    windowListeners,
  };
};

describe('web connectivity', () => {
  afterEach(() => {
    scope.addEventListener = saved.addEventListener;
    scope.removeEventListener = saved.removeEventListener;

    if (saved.navigator) {
      Object.defineProperty(globalThis, 'navigator', saved.navigator);
    }
  });

  it('reports the type a browser gives, and unknown for one it does not', () => {
    installBrowser({ connection: { type: 'cellular' }, onLine: true });
    assert.equal(appConnectivity.connectionType(), 'cellular');
    assert.equal(canTellConnectionType(), true);

    installBrowser({ connection: { type: 'wifi' }, onLine: true });
    assert.equal(appConnectivity.connectionType(), 'wifi');

    installBrowser({ connection: { type: 'bluetooth' }, onLine: true });
    assert.equal(appConnectivity.connectionType(), 'unknown');

    installBrowser({ onLine: true });
    assert.equal(appConnectivity.connectionType(), 'unknown');
    assert.equal(canTellConnectionType(), false);
  });

  it('is online unless the browser says otherwise', () => {
    installBrowser({ onLine: false });
    assert.equal(appConnectivity.isOnline(), false);

    installBrowser({ onLine: true });
    assert.equal(appConnectivity.isOnline(), true);

    installBrowser({});
    assert.equal(appConnectivity.isOnline(), true);
  });

  it('tells a listener when the connection comes or goes, and stops after it unsubscribes', () => {
    const browser = installBrowser({ onLine: true });
    let calls = 0;
    const stop = appConnectivity.subscribe(() => {
      calls += 1;
    });

    browser.fire('online');
    browser.fire('offline');
    assert.equal(calls, 2);

    stop();
    browser.fire('online');
    assert.equal(calls, 2);
  });

  it('also follows the browser’s own connection change event', () => {
    const listeners = new Set<Listener>();

    installBrowser({
      connection: {
        addEventListener: (_name: string, listener: Listener) =>
          listeners.add(listener),
        removeEventListener: (_name: string, listener: Listener) =>
          listeners.delete(listener),
        type: 'wifi',
      },
      onLine: true,
    });
    let calls = 0;
    const stop = appConnectivity.subscribe(() => {
      calls += 1;
    });

    listeners.forEach((listener) => listener());
    assert.equal(calls, 1);

    stop();
    assert.equal(listeners.size, 0);
  });
});
