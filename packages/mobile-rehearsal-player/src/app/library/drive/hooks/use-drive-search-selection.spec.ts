/// <reference types="node" />

import assert from 'node:assert/strict';
import { describe, it } from 'node:test';

import type {
  DriveBrowseLocation,
  DriveDiscoveryResult,
} from '@org/google-drive';
import { createElement } from 'react';
import { act, create, type ReactTestRenderer } from 'react-test-renderer';

import { useDriveSearchSelection } from './use-drive-search-selection.js';

const ROOT_LOCATION: DriveBrowseLocation = {
  id: 'root',
  kind: 'root',
  name: 'My Drive',
  rootKind: 'my-drive',
};

const RESULTS: DriveDiscoveryResult[] = [
  {
    id: 'folder-warmups',
    kind: 'folder',
    name: 'Warmups',
    rootKind: 'my-drive',
    shared: false,
  },
  {
    availability: { status: 'available' },
    createdAt: '2026-09-16T00:00:00.000Z',
    driveFileId: 'track-warmup',
    id: 'track-warmup',
    kind: 'audio',
    mimeType: 'audio/mpeg',
    name: 'Warmup.mp3',
    provider: 'google-drive',
    rootKind: 'my-drive',
  },
];

type HarnessProps = {
  activeQuery: string | null;
  inputQuery: string;
  isComplete: boolean;
  isLoading: boolean;
  location: DriveBrowseLocation;
  results: DriveDiscoveryResult[];
};

type SelectionHook = ReturnType<typeof useDriveSearchSelection>;

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
    act(() => hookResult.current?.selectAll());

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

  it('clears selection after query, root, and folder context changes', async () => {
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
        hookResult.current?.enter();
        hookResult.current?.toggle(RESULTS[0]);
      });
      assert.equal(hookResult.current?.selectedCount, 1);

      await act(async () => {
        renderer.update(createElement(Harness, nextProps));
      });

      assert.equal(hookResult.current?.isActive, false);
      assert.equal(hookResult.current?.selectedCount, 0);
    }

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
    act(() => hookResult.current?.selectAll());
    assert.equal(hookResult.current?.canSelectAll, false);
    assert.equal(hookResult.current?.selectedCount, 0);

    act(() => renderer.unmount());
  });
});
