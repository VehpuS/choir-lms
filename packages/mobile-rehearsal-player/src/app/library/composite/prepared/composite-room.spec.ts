import assert from 'node:assert/strict';
import { describe, it } from 'node:test';

import {
  isStorageFullError,
  NO_ROOM_SUGGESTIONS,
  resolveCompositeRoom,
} from './composite-room';

const named = (name: string, extra: Record<string, unknown> = {}) =>
  Object.assign(new Error('write failed'), { name, ...extra });

describe('resolveCompositeRoom', () => {
  it('is no room when the stems do not fit', () => {
    const state = resolveCompositeRoom({ fit: 'does-not-fit' });

    assert.equal(state.kind, 'no-room');
  });

  it('carries on when the stems fit or the browser cannot say', () => {
    assert.equal(resolveCompositeRoom({ fit: 'fits' }).kind, 'ok');
    assert.equal(resolveCompositeRoom({ fit: 'unknown' }).kind, 'ok');
    assert.equal(resolveCompositeRoom({}).kind, 'ok');
  });

  it('is no room when a write fails because the device is full', () => {
    const state = resolveCompositeRoom({
      fit: 'unknown',
      failure: named('QuotaExceededError'),
    });

    assert.equal(state.kind, 'no-room');
  });

  it('leaves any other failure to the ordinary error handling', () => {
    assert.equal(
      resolveCompositeRoom({ failure: new Error('decode failed') }).kind,
      'ok',
    );
  });

  it('leads with clearing offline files, offers it as the action and blocks Create', () => {
    const state = resolveCompositeRoom({ fit: 'does-not-fit' });

    assert.ok(state.kind === 'no-room');
    assert.deepEqual(state.actions, ['clear-offline-files']);
    assert.equal(state.canCreate, false);
    assert.equal(state.retryAfterClearing, true);
    assert.match(state.suggestions[0], /offline files/i);
    assert.match(state.suggestions[1], /recordings/i);
    assert.match(
      state.suggestions[state.suggestions.length - 1],
      /remove stems/i,
    );
  });

  it('gives no counts', () => {
    const state = resolveCompositeRoom({ fit: 'does-not-fit' });

    assert.ok(state.kind === 'no-room');
    assert.doesNotMatch(
      [state.message, ...NO_ROOM_SUGGESTIONS].join(' '),
      /\d/,
    );
  });
});

describe('isStorageFullError', () => {
  it('recognises how browsers report a full device', () => {
    assert.equal(isStorageFullError(named('QuotaExceededError')), true);
    assert.equal(isStorageFullError(named('NS_ERROR_DOM_QUOTA_REACHED')), true);
    assert.equal(isStorageFullError(named('Error', { code: 22 })), true);
    assert.equal(isStorageFullError(new Error('Quota exceeded')), true);
  });

  it('does not take other errors, or non-errors, for a full device', () => {
    assert.equal(isStorageFullError(named('AbortError')), false);
    assert.equal(isStorageFullError(new Error('network')), false);
    assert.equal(isStorageFullError(null), false);
    assert.equal(isStorageFullError('quota'), false);
  });
});
