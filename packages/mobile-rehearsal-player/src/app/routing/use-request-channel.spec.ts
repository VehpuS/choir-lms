import assert from 'node:assert/strict';
import test from 'node:test';

import { advanceRequestChannel } from './use-request-channel';

test('advancing a request channel stores the value and bumps the id', () => {
  const next = advanceRequestChannel({ requestId: 0, value: null }, 'alto');

  assert.deepEqual(next, { requestId: 1, value: 'alto' });
});

test('requesting the same value again still changes the id', () => {
  const first = advanceRequestChannel({ requestId: 4, value: 'alto' }, 'alto');

  assert.equal(first.requestId, 5);
  assert.equal(first.value, 'alto');
});
