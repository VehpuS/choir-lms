/// <reference types="node" />

import assert from 'node:assert/strict';
import { afterEach, describe, it } from 'node:test';

import { createElement } from 'react';
import { act, create } from 'react-test-renderer';

import { useIsTextFieldFocused } from './use-text-field-focus.web.js';

(
  globalThis as { IS_REACT_ACT_ENVIRONMENT?: boolean }
).IS_REACT_ACT_ENVIRONMENT = true;

type Listener = (event: unknown) => void;

// A stand-in document that records listeners, so the spec can move "focus".
const installDocument = () => {
  const listeners = new Map<string, Set<Listener>>();
  const doc = {
    activeElement: null as { tagName: string } | null,
    addEventListener: (type: string, listener: Listener) => {
      listeners.set(type, (listeners.get(type) ?? new Set()).add(listener));
    },
    fire: (type: string, event: unknown) =>
      listeners.get(type)?.forEach((listener) => listener(event)),
    listenerCount: () =>
      [...listeners.values()].reduce((sum, set) => sum + set.size, 0),
    removeEventListener: (type: string, listener: Listener) => {
      listeners.get(type)?.delete(listener);
    },
  };

  (globalThis as { document?: unknown }).document = doc;

  return doc;
};

const mount = async () => {
  const box: { current?: boolean } = {};
  const Probe = () => {
    box.current = useIsTextFieldFocused();

    return null;
  };
  let renderer: ReturnType<typeof create> | undefined;

  await act(async () => {
    renderer = create(createElement(Probe));
  });

  return { box, renderer };
};

describe('useIsTextFieldFocused', () => {
  afterEach(() => {
    delete (globalThis as { document?: unknown }).document;
  });

  it('is true while a text field has focus and false once focus leaves it', async () => {
    const doc = installDocument();
    const { box } = await mount();

    assert.equal(box.current, false);

    await act(async () =>
      doc.fire('focusin', { target: { tagName: 'INPUT' } }),
    );
    assert.equal(box.current, true);

    await act(async () =>
      doc.fire('focusout', {
        relatedTarget: null,
        target: { tagName: 'INPUT' },
      }),
    );
    assert.equal(box.current, false);
  });

  it('stays true when focus moves from one text field to another', async () => {
    const doc = installDocument();
    const { box } = await mount();

    await act(async () =>
      doc.fire('focusin', { target: { tagName: 'INPUT' } }),
    );
    await act(async () =>
      doc.fire('focusout', {
        relatedTarget: { tagName: 'TEXTAREA' },
        target: { tagName: 'INPUT' },
      }),
    );

    assert.equal(box.current, true);
  });

  it('ignores focus on a button', async () => {
    const doc = installDocument();
    const { box } = await mount();

    await act(async () =>
      doc.fire('focusin', { target: { tagName: 'BUTTON' } }),
    );

    assert.equal(box.current, false);
  });

  it('stops listening when unmounted', async () => {
    const doc = installDocument();
    const { renderer } = await mount();

    await act(async () => renderer?.unmount());

    assert.equal(doc.listenerCount(), 0);
  });
});
