import assert from 'node:assert/strict';
import { describe, it } from 'node:test';

import {
  requestFilesCreateMenu,
  subscribeToFilesCreateMenuRequests,
} from './files-create-menu-request';

describe('files create menu requests', () => {
  it('tells every subscriber, and stops once unsubscribed', () => {
    let calls = 0;
    const unsubscribe = subscribeToFilesCreateMenuRequests(() => {
      calls += 1;
    });

    requestFilesCreateMenu();
    unsubscribe();
    requestFilesCreateMenu();

    assert.equal(calls, 1);
  });
});
