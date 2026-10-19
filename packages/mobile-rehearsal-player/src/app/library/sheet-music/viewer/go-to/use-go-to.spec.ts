/// <reference types="node" />

import assert from 'node:assert/strict';
import { describe, it } from 'node:test';

import { createElement } from 'react';
import { act, create } from 'react-test-renderer';

import { useGoTo } from './use-go-to.js';

(
  globalThis as { IS_REACT_ACT_ENVIRONMENT?: boolean }
).IS_REACT_ACT_ENVIRONMENT = true;

const renderHook = async () => {
  const box: { current: ReturnType<typeof useGoTo> | null } = { current: null };
  const Harness = () => {
    box.current = useGoTo();

    return null;
  };

  await act(async () => {
    create(createElement(Harness));
  });

  return box;
};

describe('useGoTo', () => {
  it('starts closed with no jump, opens, and closes', async () => {
    const box = await renderHook();

    assert.equal(box.current?.isOpen, false);
    assert.equal(box.current?.jump, undefined);

    await act(async () => {
      box.current?.open();
    });
    assert.equal(box.current?.isOpen, true);

    await act(async () => {
      box.current?.close();
    });
    assert.equal(box.current?.isOpen, false);
  });

  it('closes the drawer on a jump and makes a repeat of the same bar a new request', async () => {
    const box = await renderHook();

    await act(async () => {
      box.current?.open();
    });
    await act(async () => {
      box.current?.jumpTo(40);
    });

    assert.equal(box.current?.isOpen, false);
    assert.deepEqual(box.current?.jump, { barIndex: 40, token: 1 });

    await act(async () => {
      box.current?.jumpTo(40);
    });

    assert.deepEqual(box.current?.jump, { barIndex: 40, token: 2 });
  });
});
