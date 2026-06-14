/// <reference types="node" />

import assert from 'node:assert/strict';
import { describe, it } from 'node:test';

import {
  ADD_SCREEN_DRIVE_PANEL_ORDER,
  DRIVE_DISCOVERY_NAVIGATION_ORDER,
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
    assert.equal(shouldShowDriveStatusCard(false, 'ready'), false);
    assert.equal(shouldShowDriveStatusCard(true, 'ready'), true);
    assert.equal(shouldShowDriveStatusCard(false, 'warning'), true);
  });

  it('keeps unavailable groups visible only when unavailable sources exist', () => {
    assert.equal(shouldShowUnavailableSources(0), false);
    assert.equal(shouldShowUnavailableSources(1), true);
  });
});
