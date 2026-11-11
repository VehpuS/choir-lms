import assert from 'node:assert/strict';
import { describe, it } from 'node:test';

import { getCardPillLabel } from './card-pill-model.js';

describe('getCardPillLabel', () => {
  it('shows the take clock and the sung note', () => {
    assert.equal(
      getCardPillLabel({ recordingElapsedMs: 42_000, sungNote: 'E4' }),
      '0:42  E4',
    );
  });

  it('shows only the clock while recording and nothing is sung', () => {
    assert.equal(
      getCardPillLabel({ recordingElapsedMs: 5000, sungNote: null }),
      '0:05',
    );
  });

  it('shows only the note when not recording', () => {
    assert.equal(
      getCardPillLabel({ recordingElapsedMs: null, sungNote: 'C♯4' }),
      'C♯4',
    );
  });

  it('is null when there is nothing to say', () => {
    assert.equal(
      getCardPillLabel({ recordingElapsedMs: null, sungNote: null }),
      null,
    );
  });
});
