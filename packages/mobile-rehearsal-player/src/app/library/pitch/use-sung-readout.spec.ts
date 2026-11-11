import assert from 'node:assert/strict';
import { describe, it } from 'node:test';

import { formatSungReadout } from './use-sung-readout.js';

const note = (spokenLabel: string) => ({
  centsText: '-17',
  gauge: 0.3,
  name: 'C♯4',
  spokenLabel,
  zone: 'near' as const,
  zoneLabel: 'Near',
});

describe('formatSungReadout', () => {
  it('puts the note and its cents on one line', () => {
    assert.equal(
      formatSungReadout(note('C♯4, 17 cents flat')),
      'C♯4 · 17 cents flat',
    );
  });

  it('reads an in-tune note without cents', () => {
    assert.equal(formatSungReadout(note('E4, in tune')), 'E4 · in tune');
  });

  it('is null when nothing is sung', () => {
    assert.equal(formatSungReadout(null), null);
  });
});
