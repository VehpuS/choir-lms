import assert from 'node:assert/strict';
import { describe, it } from 'node:test';

import { SAVED_ITEM_ACTION_ORDER } from '../components/saved-item-menu/model.js';
import { resolveOfflineMenuActions } from './offline-menu-action.js';
import type { OfflineMenuState } from './offline-menu-action.js';

const menuState = (
  overrides: Partial<OfflineMenuState> = {},
): OfflineMenuState => ({
  canKeep: true,
  onKeep: () => undefined,
  onRemove: () => undefined,
  state: 'none',
  ...overrides,
});

const labels = (offline: OfflineMenuState | undefined) => {
  return resolveOfflineMenuActions(offline, 'track:a').map((action) => ({
    disabled: action.disabled ?? false,
    label: action.label,
  }));
};

describe('offline menu actions', () => {
  it('offers nothing where offline storage is not available', () => {
    assert.deepEqual(labels(undefined), []);
  });

  it('offers Keep offline for a file that is not stored or only cached automatically', () => {
    for (const state of ['none', 'available'] as const) {
      assert.deepEqual(labels(menuState({ state })), [
        { disabled: false, label: 'Keep offline' },
      ]);
    }
  });

  it('disables Keep offline for a file with no Drive version', () => {
    assert.deepEqual(labels(menuState({ canKeep: false })), [
      { disabled: true, label: 'Keep offline' },
    ]);
  });

  it('shows a disabled Downloading… in the same place while the copy is fetched', () => {
    assert.deepEqual(labels(menuState({ state: 'downloading' })), [
      { disabled: true, label: 'Downloading…' },
    ]);
  });

  it('offers Remove from offline for a kept file', () => {
    assert.deepEqual(labels(menuState({ state: 'kept' })), [
      { disabled: false, label: 'Remove from offline' },
    ]);
  });

  it('sits after Markers in the track and loop item order', () => {
    for (const kind of ['track', 'loop'] as const) {
      const order = SAVED_ITEM_ACTION_ORDER[kind];

      assert.equal(order.indexOf('Keep offline'), order.indexOf('Markers') + 1);
    }
  });
});
