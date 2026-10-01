/// <reference types="node" />

import assert from 'node:assert/strict';
import { describe, it } from 'node:test';

import {
  ADD_SCREEN_DRIVE_PANEL_ORDER,
  DRIVE_DISCOVERY_NAVIGATION_ORDER,
  shouldShowDriveLoadingRows,
  shouldShowDriveStatusCard,
  shouldShowUnavailableSources,
} from './drive-discovery-layout.js';

describe('drive discovery layout', () => {
  it('keeps Add focused on a single discovery surface', () => {
    assert.deepEqual(ADD_SCREEN_DRIVE_PANEL_ORDER, ['discovery']);
  });

  it('keeps search controls directly below breadcrumbs in discovery', () => {
    assert.deepEqual(DRIVE_DISCOVERY_NAVIGATION_ORDER, [
      'root-selector',
      'breadcrumbs',
      'search-control',
    ]);
  });

  it('keeps status-card visibility tied to loading and non-ready states', () => {
    assert.equal(shouldShowDriveStatusCard(false, 'ready', false), false);
    assert.equal(shouldShowDriveStatusCard(false, 'warning', false), true);
    assert.equal(shouldShowDriveStatusCard(true, 'ready', true), true);
  });

  it('never inserts the status card above the list while browsing loads', () => {
    assert.equal(shouldShowDriveStatusCard(true, 'neutral', false), false);
    assert.equal(shouldShowDriveStatusCard(true, 'ready', false), false);
  });

  it('shows loading rows only for an empty browse list that is loading', () => {
    const base = { isLoading: true, isSearchMode: false, rowCount: 0 };

    assert.equal(shouldShowDriveLoadingRows(base), true);
    assert.equal(shouldShowDriveLoadingRows({ ...base, rowCount: 3 }), false);
    assert.equal(
      shouldShowDriveLoadingRows({ ...base, isLoading: false }),
      false,
    );
    assert.equal(
      shouldShowDriveLoadingRows({ ...base, isSearchMode: true }),
      false,
    );
  });

  it('keeps unavailable groups visible only when unavailable sources exist', () => {
    assert.equal(shouldShowUnavailableSources(0), false);
    assert.equal(shouldShowUnavailableSources(1), true);
  });
});
