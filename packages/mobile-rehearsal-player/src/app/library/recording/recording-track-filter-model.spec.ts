import assert from 'node:assert/strict';
import { describe, it } from 'node:test';

import {
  ANY_TRACK_LABEL,
  filterTrackOptions,
  getTrackFilterValueLabel,
} from './recording-track-filter-model.js';

const options = [
  { trackId: 'a', name: 'Ici-bas!', count: 3 },
  { trackId: 'b', name: 'Ave Maria', count: 1 },
];

describe('track filter model', () => {
  it('shows the chosen track with its count, or Any track', () => {
    assert.equal(getTrackFilterValueLabel(options, 'b'), 'Ave Maria · 1');
    assert.equal(getTrackFilterValueLabel(options, undefined), ANY_TRACK_LABEL);
    assert.equal(getTrackFilterValueLabel(options, 'gone'), ANY_TRACK_LABEL);
  });

  it('narrows the tracks by typed text without caring about case', () => {
    assert.deepEqual(
      filterTrackOptions(options, ' AVE ').map((option) => option.trackId),
      ['b'],
    );
    assert.equal(filterTrackOptions(options, '').length, 2);
    assert.deepEqual(filterTrackOptions(options, 'zzz'), []);
  });
});
