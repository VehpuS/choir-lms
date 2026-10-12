/// <reference types="node" />

import type { PlacementPlanEntry } from '@org/audio-library-runtime';
import assert from 'node:assert/strict';
import { describe, it } from 'node:test';

import {
  getPlacementReviewSummary,
  getPlacementReviewToggleLabel,
} from './placement-review-summary.js';

const entry = (status: PlacementPlanEntry['status']) =>
  ({ status }) as PlacementPlanEntry;

describe('placement review summary', () => {
  it('counts clashes and items that cannot be placed on one line', () => {
    assert.equal(
      getPlacementReviewSummary([
        entry('conflict'),
        entry('conflict'),
        entry('conflict'),
        entry('invalid'),
        entry('ready'),
      ]),
      "3 clash with an existing name · 1 can't be placed",
    );
  });

  it('uses the singular for a single clash', () => {
    assert.equal(
      getPlacementReviewSummary([entry('conflict')]),
      '1 clashes with an existing name',
    );
  });

  it('labels the disclosure by what it opens', () => {
    assert.equal(getPlacementReviewToggleLabel(4, false), 'Review 4 items');
    assert.equal(getPlacementReviewToggleLabel(1, false), 'Review 1 item');
    assert.equal(getPlacementReviewToggleLabel(4, true), 'Hide items');
  });
});
