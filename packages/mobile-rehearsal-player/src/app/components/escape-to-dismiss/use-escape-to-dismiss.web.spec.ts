import assert from 'node:assert/strict';
import { describe, it } from 'node:test';

import { subscribeToEscape } from './use-escape-to-dismiss.web';

type Listener = (event: { key: string }) => void;

const createTarget = () => {
  const listeners = new Set<Listener>();

  return {
    dispatch: (key: string) =>
      listeners.forEach((listener) => listener({ key })),
    listenerCount: () => listeners.size,
    target: {
      addEventListener: (_type: 'keydown', listener: Listener) =>
        listeners.add(listener),
      removeEventListener: (_type: 'keydown', listener: Listener) =>
        listeners.delete(listener),
    },
  };
};

describe('subscribeToEscape', () => {
  it('dismisses on Escape and ignores other keys', () => {
    const { dispatch, target } = createTarget();
    let dismissals = 0;

    subscribeToEscape(target, () => {
      dismissals += 1;
    });
    dispatch('Enter');
    dispatch('Escape');

    assert.equal(dismissals, 1);
  });

  it('stops listening once unsubscribed', () => {
    const { dispatch, listenerCount, target } = createTarget();
    let dismissals = 0;

    const unsubscribe = subscribeToEscape(target, () => {
      dismissals += 1;
    });
    unsubscribe();
    dispatch('Escape');

    assert.equal(listenerCount(), 0);
    assert.equal(dismissals, 0);
  });
});
