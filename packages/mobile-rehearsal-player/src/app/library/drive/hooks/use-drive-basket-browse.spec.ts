/// <reference types="node" />

import assert from 'node:assert/strict';
import { describe, it } from 'node:test';

import type { DriveDiscoveryResult } from '@org/google-drive';
import { createElement } from 'react';
import { act, create, type ReactTestRenderer } from 'react-test-renderer';

import { createDriveBrowseContextKey } from '../utils/drive-basket-model.js';
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

const SUBFOLDER_RESULT: DriveDiscoveryResult = {
  id: 'folder-sub',
  kind: 'folder',
  name: 'Sub',
  rootKind: 'my-drive',
  shared: false,
};

const browseProps = (
  results: DriveDiscoveryResult[],
  overrides: Partial<HarnessProps> = {},
): HarnessProps => ({
  activeQuery: null,
  browse: {
    contextKey: createDriveBrowseContextKey(ROOT_LOCATION),
    isComplete: true,
    isLoading: false,
    results,
  },
  inputQuery: '',
  isComplete: true,
  isLoading: false,
  location: ROOT_LOCATION,
  results: [],
  ...overrides,
});

const mount = async (props: HarnessProps) => {
  const hookResult: { current: SelectionHook | null } = { current: null };
  const Harness = (harnessProps: HarnessProps) => {
    hookResult.current = useDriveSearchSelection(harnessProps);
    return null;
  };
  let renderer!: ReactTestRenderer;

  await act(async () => {
    renderer = create(createElement(Harness, props));
  });

  return { Harness, hookResult, renderer };
};

describe('useDriveSearchSelection while browsing', () => {
  it('selects and deselects the whole folder with one toggle', async () => {
    const { hookResult, renderer } = await mount(browseProps(RESULTS));

    assert.equal(hookResult.current?.canSelect, true);
    act(() => hookResult.current?.enter());
    act(() => hookResult.current?.toggleAll());
    assert.equal(hookResult.current?.selectedCount, RESULTS.length);
    assert.equal(hookResult.current?.isAllSelected, true);

    act(() => hookResult.current?.toggleAll());
    assert.equal(hookResult.current?.selectedCount, 0);
    assert.equal(hookResult.current?.isAllSelected, false);
    act(() => renderer.unmount());
  });

  it('keeps the basket when the user opens another folder, and marks it on arrival', async () => {
    const { Harness, hookResult, renderer } = await mount(browseProps(RESULTS));

    act(() => hookResult.current?.enter());
    act(() => hookResult.current?.toggle(RESULTS[1]));

    await act(async () => {
      renderer.update(
        createElement(
          Harness,
          browseProps([SUBFOLDER_RESULT], {
            browse: {
              contextKey: 'browse:my-drive:folder:folder-sub',
              isComplete: true,
              isLoading: false,
              results: [SUBFOLDER_RESULT],
            },
          }),
        ),
      );
    });
    assert.equal(hookResult.current?.selectedCount, 1);
    assert.equal(hookResult.current?.isAllSelected, false);

    await act(async () => {
      renderer.update(createElement(Harness, browseProps(RESULTS)));
    });
    assert.equal(
      hookResult.current?.selectedResultIds.has('track-warmup'),
      true,
    );
    act(() => renderer.unmount());
  });

  it('has no source while the folder rows are not the ones on screen', async () => {
    const { hookResult, renderer } = await mount(
      browseProps(RESULTS, { browse: null }),
    );

    assert.equal(hookResult.current?.canSelect, false);
    act(() => renderer.unmount());
  });

  it('does not fall back to the folder while a typed search has not run', async () => {
    const { hookResult, renderer } = await mount(
      browseProps(RESULTS, { activeQuery: 'old', inputQuery: 'new' }),
    );

    assert.equal(hookResult.current?.canSelect, false);
    act(() => renderer.unmount());
  });

  it('removes items from the review and returns to browsing when it empties', async () => {
    const { hookResult, renderer } = await mount(browseProps(RESULTS));

    act(() => hookResult.current?.enter());
    act(() => hookResult.current?.toggleAll());
    act(() => hookResult.current?.continueToReview());
    assert.equal(hookResult.current?.isReviewReady, true);

    act(() => hookResult.current?.remove('folder-warmups'));
    assert.equal(hookResult.current?.isReviewReady, true);
    assert.equal(hookResult.current?.selectedCount, 1);

    act(() => hookResult.current?.remove('track-warmup'));
    assert.equal(hookResult.current?.isReviewReady, false);
    assert.equal(hookResult.current?.isActive, true);
    assert.equal(hookResult.current?.selectedCount, 0);
    act(() => renderer.unmount());
  });
});
