/// <reference types="node" />

import assert from 'node:assert/strict';
import { describe, it } from 'node:test';

import { requestLoopBuilderSourceDuration } from './request-loop-builder-source-duration.js';

const SOURCE = { id: 'drive:track-1' };

const createDependencies = (
  overrides: Partial<
    Parameters<typeof requestLoopBuilderSourceDuration>[2]
  > = {},
) => {
  const events: string[] = [];

  return {
    dependencies: {
      cachedDurationMs: undefined,
      canRequest: true,
      fetchDriveDurationMs: async () => null,
      onPendingChange: (sourceId: string | null) => {
        events.push(`pending:${sourceId}`);
      },
      onResolved: (durationMs: number | null) => {
        events.push(`resolved:${durationMs}`);
      },
      persistDurationMs: (durationMs: number) => {
        events.push(`persist:${durationMs}`);
      },
      probeDurationMs: async () => null,
      ...overrides,
    },
    events,
  };
};

describe('requestLoopBuilderSourceDuration', () => {
  it('keeps the pending flag up until the player probe has finished', async () => {
    let finishProbe: (durationMs: number | null) => void = () => undefined;
    const { dependencies, events } = createDependencies({
      probeDurationMs: () => {
        events.push('probe:start');
        return new Promise((resolve) => {
          finishProbe = (durationMs) => {
            events.push('probe:end');
            resolve(durationMs);
          };
        });
      },
    });
    const request = requestLoopBuilderSourceDuration(
      SOURCE,
      { showPending: true },
      dependencies,
    );

    await new Promise((resolve) => setTimeout(resolve, 0));
    assert.deepEqual(events, [
      'pending:drive:track-1',
      'resolved:null',
      'probe:start',
    ]);

    finishProbe(185_000);

    assert.equal(await request, 185_000);
    assert.deepEqual(events.slice(-2), ['probe:end', 'pending:null']);
  });

  it('clears the pending flag after a failed lookup and failed probe', async () => {
    const { dependencies, events } = createDependencies({
      fetchDriveDurationMs: async () => {
        throw new Error('offline');
      },
    });

    assert.equal(
      await requestLoopBuilderSourceDuration(
        SOURCE,
        { showPending: true },
        dependencies,
      ),
      null,
    );
    assert.deepEqual(events, [
      'pending:drive:track-1',
      'resolved:null',
      'pending:null',
    ]);
  });

  it('uses the Drive length and persists it without probing the player', async () => {
    const { dependencies, events } = createDependencies({
      fetchDriveDurationMs: async () => 70_000,
      probeDurationMs: async () => {
        throw new Error('not reached');
      },
    });

    assert.equal(
      await requestLoopBuilderSourceDuration(
        SOURCE,
        { showPending: true },
        dependencies,
      ),
      70_000,
    );
    assert.deepEqual(events, [
      'pending:drive:track-1',
      'resolved:70000',
      'persist:70000',
      'pending:null',
    ]);
  });

  it('does not touch the player or show pending for a background lookup', async () => {
    const { dependencies, events } = createDependencies();

    assert.equal(
      await requestLoopBuilderSourceDuration(SOURCE, undefined, dependencies),
      null,
    );
    assert.deepEqual(events, ['resolved:null']);
  });

  it('answers from the stored or cached length without any request', async () => {
    const stored = createDependencies();

    assert.equal(
      await requestLoopBuilderSourceDuration(
        { ...SOURCE, durationMs: 1_000 },
        { showPending: true },
        stored.dependencies,
      ),
      1_000,
    );

    const cached = createDependencies({ cachedDurationMs: 2_000 });

    assert.equal(
      await requestLoopBuilderSourceDuration(
        SOURCE,
        { showPending: true },
        cached.dependencies,
      ),
      2_000,
    );
    assert.deepEqual([...stored.events, ...cached.events], []);
  });

  it('retries a failed lookup only when asked to', async () => {
    const failed = createDependencies({ cachedDurationMs: null });

    assert.equal(
      await requestLoopBuilderSourceDuration(
        SOURCE,
        undefined,
        failed.dependencies,
      ),
      null,
    );
    assert.deepEqual(failed.events, []);

    const retried = createDependencies({
      cachedDurationMs: null,
      fetchDriveDurationMs: async () => 5_000,
    });

    assert.equal(
      await requestLoopBuilderSourceDuration(
        SOURCE,
        { retryFailedLookup: true },
        retried.dependencies,
      ),
      5_000,
    );
  });

  it('makes no request while unauthorized', async () => {
    const { dependencies, events } = createDependencies({
      canRequest: false,
    });

    assert.equal(
      await requestLoopBuilderSourceDuration(
        SOURCE,
        { showPending: true },
        dependencies,
      ),
      undefined,
    );
    assert.deepEqual(events, []);
  });
});
