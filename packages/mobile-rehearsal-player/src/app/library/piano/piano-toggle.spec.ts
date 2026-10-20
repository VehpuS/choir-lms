import assert from 'node:assert/strict';
import { describe, it } from 'node:test';

import { getPianoToggleModel } from './piano-toggle.js';

describe('piano toggle', () => {
  it('opens the piano', () => {
    assert.deepEqual(getPianoToggleModel(false), {
      accessibilityLabel: 'Open piano',
      selected: false,
      nextPreferences: { isOpen: true },
    });
  });

  it('closes it, showing the pressed state while open', () => {
    const model = getPianoToggleModel(true);

    assert.equal(model.accessibilityLabel, 'Close piano');
    assert.equal(model.selected, true);
    assert.deepEqual(model.nextPreferences, { isOpen: false });
  });
});
