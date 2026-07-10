/// <reference types="node" />

import assert from 'node:assert/strict';
import { describe, it } from 'node:test';

import {
  resolveInteractionGuardTouchAction,
  shouldStopTouchPropagation,
} from './interaction-guard-model';

describe('interaction guard', () => {
  it('does not stop touch propagation on web', () => {
    assert.equal(shouldStopTouchPropagation('web'), false);
  });

  it('keeps native touch propagation protection for ios', () => {
    assert.equal(shouldStopTouchPropagation('ios'), true);
  });

  it('only emits touch-action styles on web', () => {
    assert.deepEqual(
      resolveInteractionGuardTouchAction('ios', 'none'),
      undefined,
    );
    assert.equal(resolveInteractionGuardTouchAction('web', 'none'), 'none');
    assert.equal(
      resolveInteractionGuardTouchAction('web', 'manipulation'),
      'manipulation',
    );
  });
});
