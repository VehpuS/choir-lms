import assert from 'node:assert/strict';
import { describe, it } from 'node:test';

import {
  computeBulkTagChange,
  dropFromMixed,
  getBulkTagAcknowledgment,
  getBulkTagBaseline,
  isBulkTagChangeEmpty,
} from './bulk-tags';

describe('getBulkTagBaseline', () => {
  it('separates tags on every item from tags on some', () => {
    assert.deepEqual(
      getBulkTagBaseline([['Alto', 'Latin'], ['alto', 'Warm up'], undefined]),
      { mixedTags: ['Alto', 'Latin', 'Warm up'], sharedTags: [] },
    );
    assert.deepEqual(
      getBulkTagBaseline([
        ['Alto', 'Latin'],
        ['alto', 'Warm up'],
      ]),
      { mixedTags: ['Latin', 'Warm up'], sharedTags: ['Alto'] },
    );
  });

  it('has nothing shared for an empty selection', () => {
    assert.deepEqual(getBulkTagBaseline([]), { mixedTags: [], sharedTags: [] });
  });
});

describe('computeBulkTagChange', () => {
  const baseline = {
    mixedTags: ['Latin', 'Warm up'],
    sharedTags: ['Alto'],
  };

  it('writes nothing when the draft is untouched', () => {
    const change = computeBulkTagChange({
      baseline,
      draftTags: ['Alto', 'Latin', 'Warm up'],
      untouchedMixedTags: ['Latin', 'Warm up'],
    });

    assert.deepEqual(change, { add: [], remove: [] });
    assert.equal(isBulkTagChangeEmpty(change), true);
  });

  it('adds a new tag to every item', () => {
    assert.deepEqual(
      computeBulkTagChange({
        baseline,
        draftTags: ['Alto', 'Latin', 'Warm up', 'Soprano'],
        untouchedMixedTags: ['Latin', 'Warm up'],
      }),
      { add: ['Soprano'], remove: [] },
    );
  });

  it('adds a mixed tag to every item once it leaves the mixed set', () => {
    assert.deepEqual(
      computeBulkTagChange({
        baseline,
        draftTags: ['Alto', 'Latin', 'Warm up'],
        untouchedMixedTags: ['Warm up'],
      }),
      { add: ['Latin'], remove: [] },
    );
  });

  it('clears a removed shared or mixed tag from every item', () => {
    assert.deepEqual(
      computeBulkTagChange({
        baseline,
        draftTags: ['Latin'],
        untouchedMixedTags: ['Latin'],
      }),
      { add: [], remove: ['Alto', 'Warm up'] },
    );
  });

  it('compares tags without regard to case', () => {
    assert.deepEqual(
      computeBulkTagChange({
        baseline,
        draftTags: ['alto', 'latin', 'warm up'],
        untouchedMixedTags: ['latin', 'warm up'],
      }),
      { add: [], remove: [] },
    );
  });
});

describe('dropFromMixed', () => {
  it('removes added tags from the mixed set, ignoring case', () => {
    assert.deepEqual(dropFromMixed(['Latin', 'Warm up'], ['latin']), [
      'Warm up',
    ]);
  });
});

describe('getBulkTagAcknowledgment', () => {
  it('summarizes what changed and on how many items', () => {
    assert.deepEqual(
      getBulkTagAcknowledgment({
        change: { add: ['Soprano'], remove: ['Alto', 'Latin'] },
        targetCount: 3,
      }),
      {
        message: 'Added 1 tag and removed 2 tags on 3 items.',
        title: 'Tags updated',
      },
    );
    assert.equal(
      getBulkTagAcknowledgment({
        change: { add: [], remove: ['Alto'] },
        targetCount: 1,
      }).message,
      'Removed 1 tag on 1 item.',
    );
  });
});
