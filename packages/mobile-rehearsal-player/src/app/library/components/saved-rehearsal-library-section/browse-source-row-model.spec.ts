import assert from 'node:assert/strict';
import { describe, it } from 'node:test';

import {
  formatTracksRowIndex,
  formatTracksRowMeta,
  resolveTracksPlayAllItems,
} from './browse-source-row-model';
import { SOURCE, UNAVAILABLE_SOURCE } from './files-row-actions-test-helpers';

describe('Tracks row model', () => {
  it('reads tags then loop count, leaving the duration to its own column', () => {
    assert.equal(
      formatTracksRowMeta({
        loopCount: 3,
        source: { ...SOURCE, tags: ['Soprano', 'Latin'] },
      }),
      'Soprano · Latin · 3 loops',
    );
    assert.equal(
      formatTracksRowMeta({ loopCount: 1, source: SOURCE }),
      '1 loop',
    );
  });

  it('falls back to the kind word when a track has no tags or loops', () => {
    assert.equal(
      formatTracksRowMeta({ loopCount: 0, source: SOURCE }),
      'Track',
    );
  });

  it('numbers rows from 1', () => {
    assert.equal(formatTracksRowIndex(0), '1');
    assert.equal(formatTracksRowIndex(9), '10');
  });

  it('queues the shown tracks in order and skips ones that cannot play', () => {
    const second = { ...SOURCE, id: 'drive:second', name: 'Second.mp3' };

    assert.deepEqual(
      resolveTracksPlayAllItems([SOURCE, UNAVAILABLE_SOURCE, second]).map(
        (item) => item.sourceId,
      ),
      [SOURCE.id, second.id],
    );
  });
});
