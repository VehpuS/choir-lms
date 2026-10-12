/// <reference types="node" />

import assert from 'node:assert/strict';
import { afterEach, describe, it } from 'node:test';

import {
  clearRequestedLoopBuilder,
  requestLoopBuilder,
  subscribeToLoopBuilderRequests,
  takeRequestedLoopBuilderStart,
} from './loop-builder-request.js';

describe('loop builder request', () => {
  afterEach(() => {
    clearRequestedLoopBuilder();
  });

  it('tells subscribers which source to open', () => {
    const requests: string[] = [];
    const unsubscribe = subscribeToLoopBuilderRequests((request) => {
      requests.push(request.sourceId);
    });

    requestLoopBuilder({ sourceId: 'a', startMs: 5000 });
    unsubscribe();
    requestLoopBuilder({ sourceId: 'b', startMs: 1000 });

    assert.deepEqual(requests, ['a']);
  });

  it('hands the playhead start to the matching source once', () => {
    requestLoopBuilder({ sourceId: 'a', startMs: 5000 });

    assert.equal(
      takeRequestedLoopBuilderStart({ endMs: 60000, sourceId: 'b' }),
      null,
    );
    assert.equal(
      takeRequestedLoopBuilderStart({ endMs: 60000, sourceId: 'a' }),
      5000,
    );
    assert.equal(
      takeRequestedLoopBuilderStart({ endMs: 60000, sourceId: 'a' }),
      null,
    );
  });

  it('keeps the request until the track length is known', () => {
    requestLoopBuilder({ sourceId: 'a', startMs: 5000 });

    assert.equal(
      takeRequestedLoopBuilderStart({ endMs: 0, sourceId: 'a' }),
      null,
    );
    assert.equal(
      takeRequestedLoopBuilderStart({ endMs: 60000, sourceId: 'a' }),
      5000,
    );
  });

  it('ignores a playhead at the very start or at or past the end', () => {
    requestLoopBuilder({ sourceId: 'a', startMs: 0 });
    assert.equal(
      takeRequestedLoopBuilderStart({ endMs: 60000, sourceId: 'a' }),
      null,
    );

    requestLoopBuilder({ sourceId: 'a', startMs: 60000 });
    assert.equal(
      takeRequestedLoopBuilderStart({ endMs: 60000, sourceId: 'a' }),
      null,
    );
  });
});
