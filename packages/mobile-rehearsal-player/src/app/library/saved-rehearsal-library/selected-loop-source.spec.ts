import assert from 'node:assert/strict';
import { describe, it } from 'node:test';

import { isSelectedLoopSourceStale } from './selected-loop-source';

describe('isSelectedLoopSourceStale', () => {
  it('is stale once the selected track is no longer saved', () => {
    assert.equal(
      isSelectedLoopSourceStale({
        isLibraryLoading: false,
        savedSourceIds: ['a', 'b'],
        selectedLoopSourceId: 'c',
      }),
      true,
    );
  });

  it('is not stale while the track is saved, nothing is selected, or the library is loading', () => {
    assert.equal(
      isSelectedLoopSourceStale({
        isLibraryLoading: false,
        savedSourceIds: ['a', 'b'],
        selectedLoopSourceId: 'b',
      }),
      false,
    );
    assert.equal(
      isSelectedLoopSourceStale({
        isLibraryLoading: false,
        savedSourceIds: [],
        selectedLoopSourceId: null,
      }),
      false,
    );
    assert.equal(
      isSelectedLoopSourceStale({
        isLibraryLoading: true,
        savedSourceIds: [],
        selectedLoopSourceId: 'a',
      }),
      false,
    );
  });
});
