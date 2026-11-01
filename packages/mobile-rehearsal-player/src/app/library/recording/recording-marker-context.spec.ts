import assert from 'node:assert/strict';
import { describe, it } from 'node:test';

import {
  formatMarkerReference,
  getMarkerContext,
} from './recording-marker-context.js';

const markers = [
  { name: 'Chorus', positionMs: 65_000 },
  { name: 'Intro', positionMs: 0 },
  { name: 'Verse 2', positionMs: 38_000 },
];

describe('getMarkerContext', () => {
  it('finds the marker just passed and the next one, whatever the input order', () => {
    assert.deepEqual(getMarkerContext(markers, 42_000), {
      passed: { name: 'Verse 2', positionMs: 38_000 },
      next: { name: 'Chorus', positionMs: 65_000 },
    });
  });

  it('counts a marker at the exact position as passed', () => {
    assert.equal(getMarkerContext(markers, 38_000).passed?.name, 'Verse 2');
  });

  it('has no next marker after the last, and no passed marker before the first', () => {
    assert.equal(getMarkerContext(markers, 99_000).next, undefined);
    assert.equal(
      getMarkerContext([{ name: 'A', positionMs: 5000 }], 1000).passed,
      undefined,
    );
  });

  it('is empty for a track with no markers', () => {
    assert.deepEqual(getMarkerContext([], 1000), {});
  });
});

describe('formatMarkerReference', () => {
  it('names the marker with its time', () => {
    assert.equal(
      formatMarkerReference(markers[2] as (typeof markers)[number]),
      'Verse 2 · 0:38',
    );
  });
});
