/// <reference types="node" />

import assert from 'node:assert/strict';
import { describe, it } from 'node:test';

import { createElement } from 'react';
import { act, create } from 'react-test-renderer';

import { usePageAreaFocus } from './use-page-area-focus.js';

(
  globalThis as { IS_REACT_ACT_ENVIRONMENT?: boolean }
).IS_REACT_ACT_ENVIRONMENT = true;

const mount = async () => {
  const box: { current?: ReturnType<typeof usePageAreaFocus> } = {};
  const Probe = () => {
    box.current = usePageAreaFocus();

    return null;
  };

  await act(async () => {
    create(createElement(Probe));
  });

  return box;
};

describe('usePageAreaFocus', () => {
  it('starts without a request', async () => {
    const box = await mount();

    assert.equal(box.current?.focusRequest, 0);
  });

  it('makes a new request each time focus is returned', async () => {
    const box = await mount();

    await act(async () => box.current?.returnFocus());
    await act(async () => box.current?.returnFocus());

    assert.equal(box.current?.focusRequest, 2);
  });

  it('runs a wrapped toolbar action, then asks for focus', async () => {
    const box = await mount();
    const calls: string[] = [];

    await act(async () => box.current?.after(() => calls.push('zoom'))());

    assert.deepEqual(calls, ['zoom']);
    assert.equal(box.current?.focusRequest, 1);
  });
});
