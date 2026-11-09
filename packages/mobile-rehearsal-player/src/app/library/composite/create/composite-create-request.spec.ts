import assert from 'node:assert/strict';
import { afterEach, describe, it } from 'node:test';

import {
  closeCompositeCreate,
  completeCompositeCreate,
  requestCompositeCreate,
} from './composite-create-request';

describe('composite create request callbacks', () => {
  afterEach(() => {
    closeCompositeCreate();
  });

  it('tells the asker when Create was pressed', () => {
    let created = 0;

    requestCompositeCreate(['a', 'b'], () => {
      created += 1;
    });
    completeCompositeCreate();

    assert.equal(created, 1);
  });

  it('keeps the asker waiting when the sheet is cancelled', () => {
    let created = 0;

    requestCompositeCreate(['a', 'b'], () => {
      created += 1;
    });
    closeCompositeCreate();
    completeCompositeCreate();

    assert.equal(created, 0);
  });
});
