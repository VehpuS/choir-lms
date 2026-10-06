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

describe('useDriveSearchSelection select-all toggle', () => {
  it('reads Deselect all once everything is selected and toggles back', async () => {
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
    assert.equal(hookResult.current?.isAllSelected, false);

    act(() => hookResult.current?.toggleAll());
    assert.equal(hookResult.current?.isAllSelected, true);
    assert.equal(hookResult.current?.selectedCount, 2);

    act(() => hookResult.current?.toggle(RESULTS[0]));
    assert.equal(hookResult.current?.isAllSelected, false);

    act(() => hookResult.current?.toggle(RESULTS[0]));
    assert.equal(hookResult.current?.isAllSelected, true);

    act(() => hookResult.current?.toggleAll());
    assert.equal(hookResult.current?.selectedCount, 0);
    assert.equal(hookResult.current?.isAllSelected, false);
    assert.equal(hookResult.current?.isActive, true);
    act(() => renderer.unmount());
  });

  it('treats selecting every row by hand as all selected', async () => {
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
    act(() => hookResult.current?.toggle(RESULTS[0]));
    act(() => hookResult.current?.toggle(RESULTS[1]));

    assert.equal(hookResult.current?.isAllSelected, true);
    act(() => renderer.unmount());
  });

  it('deselects while results are still loading, stops gathering, and a later page stays unselected', async () => {
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
    assert.equal(hookResult.current?.isAllSelected, true);

    act(() => hookResult.current?.toggleAll());
    assert.equal(hookResult.current?.isSelectingAll, false);
    assert.equal(hookResult.current?.selectedCount, 0);

    await act(async () => {
      renderer.update(
        createElement(Harness, {
          ...loadingProps,
          isLoading: false,
          results: RESULTS,
        }),
      );
    });

    assert.equal(hookResult.current?.selectedCount, 0);
    assert.equal(hookResult.current?.isAllSelected, false);
    act(() => renderer.unmount());
  });

  it('returns to Select all when a later page arrives after a completed select-all', async () => {
    const hookResult: { current: SelectionHook | null } = { current: null };
    const Harness = (props: HarnessProps) => {
      hookResult.current = useDriveSearchSelection(props);
      return null;
    };
    const props: HarnessProps = {
      activeQuery: 'Warmups',
      inputQuery: 'Warmups',
      isComplete: true,
      isLoading: false,
      location: ROOT_LOCATION,
      results: RESULTS.slice(0, 1),
    };
    let renderer!: ReactTestRenderer;

    await act(async () => {
      renderer = create(createElement(Harness, props));
    });
    act(() => hookResult.current?.toggleAll());
    assert.equal(hookResult.current?.isAllSelected, true);

    await act(async () => {
      renderer.update(createElement(Harness, { ...props, results: RESULTS }));
    });

    assert.equal(hookResult.current?.isAllSelected, false);
    act(() => renderer.unmount());
  });

  it('keeps basket items from another search when deselecting all', async () => {
    const hookResult: { current: SelectionHook | null } = { current: null };
    const Harness = (props: HarnessProps) => {
      hookResult.current = useDriveSearchSelection(props);
      return null;
    };
    const props: HarnessProps = {
      activeQuery: 'Warmups',
      inputQuery: 'Warmups',
      isComplete: true,
      isLoading: false,
      location: ROOT_LOCATION,
      results: RESULTS.slice(0, 1),
    };
    let renderer!: ReactTestRenderer;

    await act(async () => {
      renderer = create(createElement(Harness, props));
    });
    act(() => hookResult.current?.toggleAll());

    await act(async () => {
      renderer.update(
        createElement(Harness, {
          ...props,
          activeQuery: 'Anthems',
          inputQuery: 'Anthems',
          results: RESULTS.slice(1),
        }),
      );
    });
    assert.equal(hookResult.current?.isAllSelected, false);

    act(() => hookResult.current?.toggleAll());
    assert.equal(hookResult.current?.selectedCount, 2);
    assert.equal(hookResult.current?.isAllSelected, true);

    act(() => hookResult.current?.toggleAll());
    assert.deepEqual(hookResult.current?.selectedResults, [RESULTS[0]]);
    act(() => renderer.unmount());
  });
});
