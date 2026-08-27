/// <reference types="node" />

import assert from 'node:assert/strict';
import { describe, it } from 'node:test';

import type { DriveAuthorizationState } from '@org/google-drive';
import { createElement } from 'react';
import { act, create, type ReactTestRenderer } from 'react-test-renderer';

import { useDriveLibrarySearch } from './use-drive-library-search.js';

const AUTHORIZED_STATE: DriveAuthorizationState = {
  scope: 'https://www.googleapis.com/auth/drive.readonly',
  status: 'authorized',
};

const SEARCH_QUERY = 'beatles';
const DEBOUNCE_SETTLE_MS = 400;
const UNRELATED_RERENDER_TICK = 1;

const waitForMs = async (durationMs: number) => {
  await new Promise<void>((resolve) => {
    setTimeout(resolve, durationMs);
  });
};

const createMemoryLocalStorage = () => {
  const store = new Map<string, string>();

  return {
    clear: () => store.clear(),
    getItem: (key: string) =>
      store.has(key) ? (store.get(key) as string) : null,
    removeItem: (key: string) => {
      store.delete(key);
    },
    setItem: (key: string, value: string) => {
      store.set(key, value);
    },
  };
};

// use-recent-search-history reads AsyncStorage's web implementation, which
// reaches through `window.localStorage`. Node has no `window`; shim just
// enough for that effect to resolve instead of rejecting unhandled.
(globalThis as { window?: { localStorage: unknown } }).window ??= {
  localStorage: createMemoryLocalStorage(),
};

// Tells React this environment intentionally drives updates through
// act(...), since nothing else here (no Jest) sets this for us.
(
  globalThis as { IS_REACT_ACT_ENVIRONMENT?: boolean }
).IS_REACT_ACT_ENVIRONMENT = true;

describe('useDriveLibrarySearch', () => {
  it('still runs the debounced search after an unrelated re-render lands mid-debounce', async () => {
    type DriveLibrarySearchHookResult = ReturnType<
      typeof useDriveLibrarySearch
    >;

    // A mutable container (rather than a bare `let`) so TypeScript doesn't
    // narrow the value to `never` at the read below, since the only
    // assignment happens inside the Harness closure.
    const hookResultBox: { current: DriveLibrarySearchHookResult | null } = {
      current: null,
    };
    const searchRequestTicks: number[] = [];

    const Harness = ({ tick }: { tick: number }) => {
      hookResultBox.current = useDriveLibrarySearch({
        authState: AUTHORIZED_STATE,
        onClearIssue: () => undefined,
        // A fresh closure every render, matching the real caller
        // (use-drive-library.ts) shape that triggered the regression.
        onSearchRequested: () => {
          searchRequestTicks.push(tick);
        },
      });
      return null;
    };

    let renderer!: ReactTestRenderer;

    await act(async () => {
      renderer = create(createElement(Harness, { tick: 0 }));
    });

    act(() => {
      hookResultBox.current?.setSearchQuery(SEARCH_QUERY);
    });

    // Simulate something unrelated re-rendering the tree while the search
    // is still debouncing (e.g. a JS-driven animation elsewhere in the app).
    act(() => {
      renderer.update(
        createElement(Harness, { tick: UNRELATED_RERENDER_TICK }),
      );
    });

    await act(async () => {
      await waitForMs(DEBOUNCE_SETTLE_MS);
    });

    assert.equal(hookResultBox.current?.activeSearchQuery, SEARCH_QUERY);
    assert.deepEqual(searchRequestTicks, [UNRELATED_RERENDER_TICK]);

    act(() => {
      renderer.unmount();
    });
  });
});
