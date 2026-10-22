/// <reference types="node" />

import assert from 'node:assert/strict';
import { afterEach, describe, it } from 'node:test';

import {
  clearRequestedLoopBuilder,
  requestLoopBuilder,
  subscribeToLoopBuilderRequests,
  takeRequestedLoopBuilderDraft,
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
      takeRequestedLoopBuilderDraft({ endMs: 60000, sourceId: 'b' }),
      null,
    );
    assert.deepEqual(
      takeRequestedLoopBuilderDraft({ endMs: 60000, sourceId: 'a' }),
      { startMs: 5000 },
    );
    assert.equal(
      takeRequestedLoopBuilderDraft({ endMs: 60000, sourceId: 'a' }),
      null,
    );
  });

  it('keeps the request until the track length is known', () => {
    requestLoopBuilder({ sourceId: 'a', startMs: 5000 });

    assert.equal(
      takeRequestedLoopBuilderDraft({ endMs: 0, sourceId: 'a' }),
      null,
    );
    assert.deepEqual(
      takeRequestedLoopBuilderDraft({ endMs: 60000, sourceId: 'a' }),
      { startMs: 5000 },
    );
  });

  it('ignores a playhead at the very start or at or past the end', () => {
    requestLoopBuilder({ sourceId: 'a', startMs: 0 });
    assert.equal(
      takeRequestedLoopBuilderDraft({ endMs: 60000, sourceId: 'a' }),
      null,
    );

    requestLoopBuilder({ sourceId: 'a', startMs: 60000 });
    assert.equal(
      takeRequestedLoopBuilderDraft({ endMs: 60000, sourceId: 'a' }),
      null,
    );
  });

  it('hands over a marker loop with its end and name', () => {
    requestLoopBuilder({
      endMs: 90_000,
      name: 'Chorus',
      sourceId: 'a',
      startMs: 30_000,
    });

    assert.deepEqual(
      takeRequestedLoopBuilderDraft({ endMs: 120_000, sourceId: 'a' }),
      { endMs: 90_000, name: 'Chorus', startMs: 30_000 },
    );
  });

  it('allows a marker loop to start at the very beginning', () => {
    requestLoopBuilder({ endMs: 20_000, sourceId: 'a', startMs: 0 });

    assert.deepEqual(
      takeRequestedLoopBuilderDraft({ endMs: 120_000, sourceId: 'a' }),
      { endMs: 20_000, startMs: 0 },
    );
  });

  it('keeps a marker loop inside a shorter track', () => {
    requestLoopBuilder({ endMs: 90_000, sourceId: 'a', startMs: 30_000 });

    assert.deepEqual(
      takeRequestedLoopBuilderDraft({ endMs: 60_000, sourceId: 'a' }),
      { endMs: 60_000, startMs: 30_000 },
    );
  });

  it('drops a marker loop that no longer fits the track', () => {
    requestLoopBuilder({ endMs: 90_000, sourceId: 'a', startMs: 70_000 });

    assert.equal(
      takeRequestedLoopBuilderDraft({ endMs: 60_000, sourceId: 'a' }),
      null,
    );
  });
});
