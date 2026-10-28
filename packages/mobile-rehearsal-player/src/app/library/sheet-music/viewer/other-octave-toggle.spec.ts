import assert from 'node:assert/strict';
import { describe, it } from 'node:test';

import { getOtherOctaveToggle } from './other-octave-toggle.js';

describe('getOtherOctaveToggle', () => {
  it('names the setting and its state beside a score', () => {
    assert.deepEqual(
      getOtherOctaveToggle({ canListen: true, isScore: true, isOn: false }),
      { accessibilityLabel: 'Show other-octave matches, off', isOn: false },
    );
    assert.deepEqual(
      getOtherOctaveToggle({ canListen: true, isScore: true, isOn: true }),
      { accessibilityLabel: 'Show other-octave matches, on', isOn: true },
    );
  });

  it('is absent for a PDF or before a score has loaded', () => {
    assert.equal(
      getOtherOctaveToggle({ canListen: true, isScore: false, isOn: true }),
      null,
    );
  });

  it('is absent where pitch detection cannot listen', () => {
    assert.equal(
      getOtherOctaveToggle({ canListen: false, isScore: true, isOn: true }),
      null,
    );
  });
});
