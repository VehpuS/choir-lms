import assert from 'node:assert/strict';
import { describe, it } from 'node:test';

import {
  NOTHING_TO_CLEAR_CONTENT,
  resolveClearOfflineFilesPlan,
} from './clear-offline-files-plan';

const row = { driveFileId: 'a', sizeBytes: 1_000_000 } as never;

describe('resolveClearOfflineFilesPlan', () => {
  it('asks the Clear all confirmation when there is something to clear', () => {
    const plan = resolveClearOfflineFilesPlan([row], {
      count: 0,
      totalBytes: 0,
    });

    assert.equal(plan.clears, true);
    assert.equal(plan.content.title, 'Clear all offline files?');
  });

  it('asks it for prepared composites alone', () => {
    const plan = resolveClearOfflineFilesPlan([], {
      count: 1,
      totalBytes: 5_000_000,
    });

    assert.equal(plan.clears, true);
    assert.match(plan.content.message, /prepared audio of 1 composite/);
  });

  it('says so when there is nothing to clear, and clears nothing', () => {
    const plan = resolveClearOfflineFilesPlan([], { count: 0, totalBytes: 0 });

    assert.equal(plan.clears, false);
    assert.equal(plan.content, NOTHING_TO_CLEAR_CONTENT);
  });
});
