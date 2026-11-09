import assert from 'node:assert/strict';
import { describe, it } from 'node:test';

import { isActiveCompositeDeleted } from './pause-when-deleted';

const COMPOSITE_ITEM = { kind: 'composite', sourceId: 'c1' } as const;

describe('isActiveCompositeDeleted', () => {
  it('is true when the playing composite left the list', () => {
    assert.equal(
      isActiveCompositeDeleted({
        activeItem: COMPOSITE_ITEM,
        currentIds: ['c2'],
        previousIds: ['c1', 'c2'],
      }),
      true,
    );
  });

  it('is false while the composite is still there', () => {
    assert.equal(
      isActiveCompositeDeleted({
        activeItem: COMPOSITE_ITEM,
        currentIds: ['c1'],
        previousIds: ['c1'],
      }),
      false,
    );
  });

  it('is false before the first read has listed the composite', () => {
    assert.equal(
      isActiveCompositeDeleted({
        activeItem: COMPOSITE_ITEM,
        currentIds: [],
        previousIds: [],
      }),
      false,
    );
  });

  it('is false for a track or nothing playing', () => {
    assert.equal(
      isActiveCompositeDeleted({
        activeItem: { kind: 'track', sourceId: 'c1' },
        currentIds: [],
        previousIds: ['c1'],
      }),
      false,
    );
    assert.equal(
      isActiveCompositeDeleted({
        activeItem: null,
        currentIds: [],
        previousIds: ['c1'],
      }),
      false,
    );
  });
});
