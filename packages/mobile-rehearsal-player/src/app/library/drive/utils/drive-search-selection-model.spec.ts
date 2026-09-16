/// <reference types="node" />

import assert from 'node:assert/strict';
import { describe, it } from 'node:test';

import type { DriveDiscoveryResult } from '@org/google-drive';

import {
  cancelDriveSearchSelection,
  continueDriveSearchSelection,
  createDriveSearchSelectionState,
  enterDriveSearchSelection,
  selectAllDriveSearchResults,
  synchronizeDriveSearchSelection,
  toggleDriveSearchSelectionResult,
  type DriveSearchSelectionContext,
} from './drive-search-selection-model.js';

const MY_DRIVE_CONTEXT: DriveSearchSelectionContext = {
  location: { id: 'root', kind: 'root', rootKind: 'my-drive' },
  query: 'Warmups',
};

const SEARCH_RESULTS: DriveDiscoveryResult[] = [
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

describe('Drive search selection model', () => {
  it('toggles individual results and cancels without discarding context', () => {
    const initialState = enterDriveSearchSelection(
      createDriveSearchSelectionState(MY_DRIVE_CONTEXT),
    );
    const selectedState = toggleDriveSearchSelectionResult(
      initialState,
      SEARCH_RESULTS[0],
    );
    const deselectedState = toggleDriveSearchSelectionResult(
      selectedState,
      SEARCH_RESULTS[0],
    );
    const cancelledState = cancelDriveSearchSelection(selectedState);

    assert.deepEqual(selectedState.selectedResults, [SEARCH_RESULTS[0]]);
    assert.deepEqual(deselectedState.selectedResults, []);
    assert.equal(cancelledState.isActive, false);
    assert.equal(cancelledState.contextKey, initialState.contextKey);
    assert.deepEqual(cancelledState.selectedResults, []);
  });

  it('tracks progressive results while preserving individual deselection', () => {
    const initialState = createDriveSearchSelectionState(MY_DRIVE_CONTEXT);
    const preparingState = selectAllDriveSearchResults(initialState, {
      isLoading: true,
      results: SEARCH_RESULTS,
    });
    const deselectedState = toggleDriveSearchSelectionResult(
      preparingState,
      SEARCH_RESULTS[0],
    );
    const laterResult: Extract<DriveDiscoveryResult, { kind: 'audio' }> = {
      availability: { status: 'available' },
      createdAt: '2026-09-16T00:00:00.000Z',
      driveFileId: 'track-later',
      id: 'track-later',
      kind: 'audio',
      mimeType: 'audio/mpeg',
      name: 'Later warmup.mp3',
      provider: 'google-drive',
      rootKind: 'my-drive',
    };
    const completeState = synchronizeDriveSearchSelection(deselectedState, {
      context: MY_DRIVE_CONTEXT,
      isComplete: true,
      isLoading: false,
      results: [...SEARCH_RESULTS, laterResult],
    });

    assert.equal(preparingState.isSelectingAll, true);
    assert.deepEqual(deselectedState.selectedResults, [SEARCH_RESULTS[1]]);
    assert.equal(completeState.isSelectingAll, false);
    assert.deepEqual(completeState.selectedResults, [
      SEARCH_RESULTS[1],
      laterResult,
    ]);
  });

  it('freezes a nonempty complete selection for the review handoff', () => {
    const selectedState = toggleDriveSearchSelectionResult(
      enterDriveSearchSelection(
        createDriveSearchSelectionState(MY_DRIVE_CONTEXT),
      ),
      SEARCH_RESULTS[0],
    );
    const readyState = continueDriveSearchSelection(selectedState);
    const unchangedState = toggleDriveSearchSelectionResult(
      readyState,
      SEARCH_RESULTS[1],
    );

    assert.equal(readyState.isReviewReady, true);
    assert.deepEqual(unchangedState, readyState);
  });

  it('clears stale selection when the query, root, or folder changes', () => {
    const selectedState = selectAllDriveSearchResults(
      createDriveSearchSelectionState(MY_DRIVE_CONTEXT),
      { isLoading: false, results: SEARCH_RESULTS },
    );
    const changedContexts: DriveSearchSelectionContext[] = [
      { ...MY_DRIVE_CONTEXT, query: 'Anthems' },
      {
        location: { id: 'shared', kind: 'root', rootKind: 'shared' },
        query: MY_DRIVE_CONTEXT.query,
      },
      {
        location: {
          id: 'folder-choir',
          kind: 'folder',
          rootKind: 'my-drive',
        },
        query: MY_DRIVE_CONTEXT.query,
      },
    ];

    for (const context of changedContexts) {
      const nextState = synchronizeDriveSearchSelection(selectedState, {
        context,
        isComplete: true,
        isLoading: false,
        results: SEARCH_RESULTS,
      });

      assert.equal(nextState.isActive, false);
      assert.deepEqual(nextState.selectedResults, []);
    }
  });

  it('does not retain complete-set selection after incomplete discovery', () => {
    const preparingState = selectAllDriveSearchResults(
      createDriveSearchSelectionState(MY_DRIVE_CONTEXT),
      { isLoading: true, results: SEARCH_RESULTS },
    );
    const incompleteState = synchronizeDriveSearchSelection(preparingState, {
      context: MY_DRIVE_CONTEXT,
      isComplete: false,
      isLoading: false,
      results: SEARCH_RESULTS,
    });

    assert.equal(incompleteState.isSelectingAll, false);
    assert.deepEqual(incompleteState.selectedResults, []);
  });
});
