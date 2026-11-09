import assert from 'node:assert/strict';
import { describe, it } from 'node:test';

import { setCompositeLyricsStem } from './composite-lyrics-edit.ts';
import type { CompositeTrack } from './composite-track.ts';

const composite = {
  id: 'c1',
  stems: [
    { id: 's1', trackId: 't1', name: 'Soprano' },
    { id: 's2', trackId: 't2', name: 'Alto' },
  ],
} as unknown as CompositeTrack;

describe('setCompositeLyricsStem', () => {
  it('remembers the picked stem', () => {
    assert.equal(setCompositeLyricsStem(composite, 's2').lyricsStemId, 's2');
  });

  it('ignores a stem the composite does not have', () => {
    assert.equal(setCompositeLyricsStem(composite, 'gone'), composite);
  });
});
