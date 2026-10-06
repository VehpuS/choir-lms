/// <reference types="node" />

import assert from 'node:assert/strict';
import { describe, it } from 'node:test';

import { createElement } from 'react';
import { act, create, type ReactTestRenderer } from 'react-test-renderer';

import { useDriveSearchSelection } from './use-drive-search-selection.js';
import {
  RESULTS,
  ROOT_LOCATION,
  type HarnessProps,
  type SelectionHook,
} from './use-drive-search-selection-test-fixtures.js';

(
  globalThis as { IS_REACT_ACT_ENVIRONMENT?: boolean }
).IS_REACT_ACT_ENVIRONMENT = true;

describe('useDriveSearchSelection', () => {
  it('selects progressive result batches through complete discovery', async () => {
    const hookResult: { current: SelectionHook | null } = { current: null };
    const Harness = (props: HarnessProps) => {
      hookResult.current = useDriveSearchSelection(props);
      return null;
    };
    let renderer!: ReactTestRenderer;

    await act(async () => {
      renderer = create(
        createElement(Harness, {
          activeQuery: 'Warmups',
          inputQuery: 'Warmups',
          isComplete: true,
          isLoading: true,
          location: ROOT_LOCATION,
          results: RESULTS.slice(0, 1),
        }),
      );
    });
    act(() => hookResult.current?.toggleAll());

    assert.equal(hookResult.current?.isSelectingAll, true);
    assert.equal(hookResult.current?.selectedCount, 1);

    await act(async () => {
      renderer.update(
        createElement(Harness, {
          activeQuery: 'Warmups',
          inputQuery: 'Warmups',
          isComplete: true,
          isLoading: false,
          location: ROOT_LOCATION,
          results: RESULTS,
        }),
      );
    });

    assert.equal(hookResult.current?.isSelectingAll, false);
    assert.deepEqual(hookResult.current?.selectedResults, RESULTS);
    act(() => renderer.unmount());
  });

  it('keeps the basket after query, root, and folder context changes', async () => {
    const hookResult: { current: SelectionHook | null } = { current: null };
    const Harness = (props: HarnessProps) => {
      hookResult.current = useDriveSearchSelection(props);
      return null;
    };
    const initialProps: HarnessProps = {
      activeQuery: 'Warmups',
      inputQuery: 'Warmups',
      isComplete: true,
      isLoading: false,
      location: ROOT_LOCATION,
      results: RESULTS,
    };
    let renderer!: ReactTestRenderer;

    await act(async () => {
      renderer = create(createElement(Harness, initialProps));
    });

    const changedProps: HarnessProps[] = [
      { ...initialProps, inputQuery: 'Anthems' },
      {
        ...initialProps,
        location: {
          id: 'shared',
          kind: 'root',
          name: 'Shared with you',
          rootKind: 'shared',
        },
      },
      {
        ...initialProps,
        location: {
          id: 'folder-choir',
          kind: 'folder',
          name: 'Choir',
          rootKind: 'my-drive',
        },
      },
    ];

    for (const nextProps of changedProps) {
      await act(async () => {
        renderer.update(createElement(Harness, initialProps));
      });
      act(() => {
        hookResult.current?.cancel();
        hookResult.current?.enter();
      });
      act(() => hookResult.current?.toggle(RESULTS[0]));
      assert.equal(hookResult.current?.selectedCount, 1);

      await act(async () => {
        renderer.update(createElement(Harness, nextProps));
      });

      assert.equal(hookResult.current?.isActive, true);
      assert.deepEqual(hookResult.current?.selectedResults, [RESULTS[0]]);
    }

    act(() => renderer.unmount());
  });

  it('ends a pending select-all on a context change but keeps the pages it added', async () => {
    const hookResult: { current: SelectionHook | null } = { current: null };
    const Harness = (props: HarnessProps) => {
      hookResult.current = useDriveSearchSelection(props);
      return null;
    };
    const loadingProps: HarnessProps = {
      activeQuery: 'Warmups',
      inputQuery: 'Warmups',
      isComplete: true,
      isLoading: true,
      location: ROOT_LOCATION,
      results: RESULTS.slice(0, 1),
    };
    let renderer!: ReactTestRenderer;

    await act(async () => {
      renderer = create(createElement(Harness, loadingProps));
    });
    act(() => hookResult.current?.toggleAll());
    assert.equal(hookResult.current?.isSelectingAll, true);

    await act(async () => {
      renderer.update(
        createElement(Harness, {
          ...loadingProps,
          activeQuery: 'Anthems',
          inputQuery: 'Anthems',
          results: [RESULTS[1]],
        }),
      );
    });

    assert.equal(hookResult.current?.isSelectingAll, false);
    assert.deepEqual(hookResult.current?.selectedResults, [RESULTS[0]]);
    act(() => renderer.unmount());
  });

  it('clears the basket but stays in selection mode, and cancel leaves it', async () => {
    const hookResult: { current: SelectionHook | null } = { current: null };
    const Harness = (props: HarnessProps) => {
      hookResult.current = useDriveSearchSelection(props);
      return null;
    };
    let renderer!: ReactTestRenderer;

    await act(async () => {
      renderer = create(
        createElement(Harness, {
          activeQuery: 'Warmups',
          inputQuery: 'Warmups',
          isComplete: true,
          isLoading: false,
          location: ROOT_LOCATION,
          results: RESULTS,
        }),
      );
    });
    act(() => hookResult.current?.toggleAll());
    assert.equal(hookResult.current?.selectedCount, 2);

    act(() => hookResult.current?.clear());
    assert.equal(hookResult.current?.selectedCount, 0);
    assert.equal(hookResult.current?.isActive, true);

    act(() => hookResult.current?.cancel());
    assert.equal(hookResult.current?.isActive, false);
    act(() => renderer.unmount());
  });

  it('continues to review only with a selection and returns from review with edit', async () => {
    const hookResult: { current: SelectionHook | null } = { current: null };
    const Harness = (props: HarnessProps) => {
      hookResult.current = useDriveSearchSelection(props);
      return null;
    };
    let renderer!: ReactTestRenderer;

    await act(async () => {
      renderer = create(
        createElement(Harness, {
          activeQuery: 'Warmups',
          inputQuery: 'Warmups',
          isComplete: true,
          isLoading: false,
          location: ROOT_LOCATION,
          results: RESULTS,
        }),
      );
    });
    act(() => hookResult.current?.enter());
    act(() => hookResult.current?.continueToReview());
    assert.equal(hookResult.current?.isReviewReady, false);

    act(() => hookResult.current?.toggle(RESULTS[1]));
    act(() => hookResult.current?.continueToReview());
    assert.equal(hookResult.current?.isReviewReady, true);

    act(() => hookResult.current?.edit());
    assert.equal(hookResult.current?.isReviewReady, false);
    assert.equal(hookResult.current?.selectedCount, 1);
    act(() => renderer.unmount());
  });

  it('blocks stale-query and incomplete complete-set selection', async () => {
    const hookResult: { current: SelectionHook | null } = { current: null };
    const Harness = (props: HarnessProps) => {
      hookResult.current = useDriveSearchSelection(props);
      return null;
    };
    const props: HarnessProps = {
      activeQuery: 'Warmups',
      inputQuery: 'Anthems',
      isComplete: true,
      isLoading: false,
      location: ROOT_LOCATION,
      results: RESULTS,
    };
    let renderer!: ReactTestRenderer;

    await act(async () => {
      renderer = create(createElement(Harness, props));
    });
    act(() => hookResult.current?.enter());
    assert.equal(hookResult.current?.canSelect, false);
    assert.equal(hookResult.current?.isActive, false);

    await act(async () => {
      renderer.update(
        createElement(Harness, {
          ...props,
          inputQuery: 'Warmups',
          isComplete: false,
        }),
      );
    });
    act(() => hookResult.current?.toggleAll());
    assert.equal(hookResult.current?.canSelectAll, false);
    assert.equal(hookResult.current?.selectedCount, 0);

    act(() => renderer.unmount());
  });
});
