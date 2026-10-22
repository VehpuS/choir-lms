import assert from 'node:assert/strict';
import { describe, it } from 'node:test';

import {
  MARKER_ADD_FAILED_MESSAGE,
  MARKER_LIMIT_MESSAGE,
  toMarkerAddResult,
} from './marker-add-result';

const MARKER = {
  id: 'marker-1',
  name: 'Marker 1',
  positionMs: 72_400,
  createdAt: '2026-10-22T00:00:00.000Z',
};

describe('toMarkerAddResult', () => {
  it('returns the added marker', () => {
    assert.deepEqual(toMarkerAddResult({ status: 'ok', marker: MARKER }), {
      marker: MARKER,
    });
  });

  it('tells the user about the 200 marker limit', () => {
    assert.deepEqual(toMarkerAddResult({ status: 'limit-reached' }), {
      error: MARKER_LIMIT_MESSAGE,
    });
    assert.match(MARKER_LIMIT_MESSAGE, /200 markers/);
  });

  it('reports any other failure generically', () => {
    for (const status of [
      'unavailable',
      'invalid-position',
      'not-found',
    ] as const) {
      assert.deepEqual(toMarkerAddResult({ status }), {
        error: MARKER_ADD_FAILED_MESSAGE,
      });
    }
  });

  it('treats an ok write without a marker as a failure', () => {
    assert.deepEqual(toMarkerAddResult({ status: 'ok' }), {
      error: MARKER_ADD_FAILED_MESSAGE,
    });
  });
});
