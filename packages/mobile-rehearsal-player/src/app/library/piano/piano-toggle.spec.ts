import assert from 'node:assert/strict';
import { describe, it } from 'node:test';

import { getPianoToggleModel } from './piano-toggle.js';

describe('piano toggle', () => {
  it('opens the keyboard, even from a collapsed handle', () => {
    assert.deepEqual(getPianoToggleModel(false), {
      accessibilityLabel: 'Open piano',
      selected: false,
      nextPreferences: { isOpen: true, isCollapsed: false },
    });
  });

  it('closes, showing the pressed state while open', () => {
    const model = getPianoToggleModel(true);

    assert.equal(model.accessibilityLabel, 'Close piano');
    assert.equal(model.selected, true);
    assert.deepEqual(model.nextPreferences, { isOpen: false });
  });

  it('opens as a handle where the screen is too short for the keyboard', () => {
    assert.deepEqual(
      getPianoToggleModel(false, { openCollapsed: true }).nextPreferences,
      { isOpen: true, isCollapsed: true },
    );
    assert.deepEqual(
      getPianoToggleModel(true, { openCollapsed: true }).nextPreferences,
      { isOpen: false },
    );
  });
});
