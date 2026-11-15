import assert from 'node:assert/strict';
import { describe, it } from 'node:test';

import { getListeningLoadLabel } from './listening-load-label';

describe('getListeningLoadLabel', () => {
  it('says the track is being prepared, how far, and that it happens once', () => {
    assert.equal(
      getListeningLoadLabel({
        trackId: 't1',
        phase: 'preparing',
        fraction: 0.426,
      }),
      'Preparing for listening · 42% · first time only',
    );
  });

  it('has nothing to say for a prepared track that only opens, or no load', () => {
    assert.equal(
      getListeningLoadLabel({ trackId: 't1', phase: 'loading', fraction: 0.5 }),
      null,
    );
    assert.equal(getListeningLoadLabel(null), null);
  });
});
