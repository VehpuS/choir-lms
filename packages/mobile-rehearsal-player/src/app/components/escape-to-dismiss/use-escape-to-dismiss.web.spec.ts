import assert from 'node:assert/strict';
import { describe, it } from 'node:test';

import {
  createEscapeStack,
  subscribeToEscape,
} from './use-escape-to-dismiss.web';

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

describe('createEscapeStack', () => {
  it('dismisses only the most recently opened layer per press', () => {
    const { dispatch, target } = createTarget();
    const stack = createEscapeStack(target);
    const dismissed: string[] = [];

    stack.push(() => dismissed.push('sheet'));
    stack.push(() => dismissed.push('menu'));
    dispatch('Escape');

    assert.deepEqual(dismissed, ['menu']);
  });

  it('hands Escape to the layer below once the top one has closed', () => {
    const { dispatch, target } = createTarget();
    const stack = createEscapeStack(target);
    const dismissed: string[] = [];

    stack.push(() => dismissed.push('sheet'));
    const closeMenu = stack.push(() => dismissed.push('menu'));

    dispatch('Escape');
    closeMenu();
    dispatch('Escape');

    assert.deepEqual(dismissed, ['menu', 'sheet']);
  });

  it('puts a layer that opens again on top', () => {
    const { dispatch, target } = createTarget();
    const stack = createEscapeStack(target);
    const dismissed: string[] = [];

    const closeSheet = stack.push(() => dismissed.push('sheet'));
    stack.push(() => dismissed.push('menu'));
    closeSheet();
    stack.push(() => dismissed.push('sheet again'));
    dispatch('Escape');

    assert.deepEqual(dismissed, ['sheet again']);
  });

  it('lets two layers share one callback and close independently', () => {
    const { dispatch, target } = createTarget();
    const stack = createEscapeStack(target);
    let count = 0;
    const dismiss = () => {
      count += 1;
    };

    stack.push(dismiss);
    const closeTop = stack.push(dismiss);
    closeTop();
    dispatch('Escape');

    assert.equal(count, 1);
  });

  it('listens only while a layer is open, and ignores other keys', () => {
    const { dispatch, listenerCount, target } = createTarget();
    const stack = createEscapeStack(target);
    let count = 0;

    assert.equal(listenerCount(), 0);

    const close = stack.push(() => {
      count += 1;
    });

    assert.equal(listenerCount(), 1);
    dispatch('Enter');
    assert.equal(count, 0);

    close();
    close();
    assert.equal(listenerCount(), 0);

    stack.push(() => undefined);
    assert.equal(listenerCount(), 1);
  });
});
