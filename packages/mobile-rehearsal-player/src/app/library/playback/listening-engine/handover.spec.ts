import assert from 'node:assert/strict';
import { describe, it } from 'node:test';

import type { PlayableItem } from '@org/audio-library-models';

import type { ActiveEngineKind } from '../../composite/playback/active-composite';
import { createTestEngine } from '../../composite/playback/composite-test-engine';
import { createAbortError } from '../utils/saved-track-blob-download';
import {
  createListeningHandover,
  type HandoverSnapshot,
  type ListeningHandoverDependencies,
} from './handover';

const item = (id = 'item-1') => ({ id }) as PlayableItem;

/** A player the spec can read: which side has the track, and what was asked of it. */
const setup = (overrides: Partial<ListeningHandoverDependencies> = {}) => {
  const state = {
    item: item() as PlayableItem | null,
    kind: null as ActiveEngineKind | null,
    wantsEngine: false,
    loadInFlight: false,
    snapshot: {
      isPlaying: true,
      positionSeconds: 42,
    } as HandoverSnapshot | null,
  };
  const calls: string[] = [];
  const failures: unknown[] = [];
  const stays: unknown[] = [];
  const engines: Array<ReturnType<typeof createTestEngine>> = [];
  const handover = createListeningHandover({
    getItem: () => state.item,
    getEngineKind: () => state.kind,
    wantsEngine: () => state.wantsEngine,
    isLoadInFlight: () => state.loadInFlight,
    readSnapshot: async () => state.snapshot,
    prepareEngine: async () => {
      const test = createTestEngine();

      engines.push(test);
      calls.push('prepare');

      return test.engine;
    },
    playOnEngine: async (_item, _engine, snapshot) => {
      calls.push(`engine@${snapshot.positionSeconds}:${snapshot.isPlaying}`);
      state.kind = 'track';
    },
    playOnElement: async (_item, snapshot) => {
      calls.push(`element@${snapshot.positionSeconds}:${snapshot.isPlaying}`);
      state.kind = null;
    },
    onStayedOnElement: (_item, error) => stays.push(error),
    onFailure: (_item, error) => failures.push(error),
    ...overrides,
  });

  return { calls, engines, failures, handover, state, stays };
};

describe('listening hand-over to the engine', () => {
  it('prepares first, then switches at the position, playing as it was', async () => {
    const t = setup();

    t.state.wantsEngine = true;
    await t.handover.sync();

    assert.deepEqual(t.calls, ['prepare', 'engine@42:true']);
  });

  it('switches a paused track without starting it', async () => {
    const t = setup();

    t.state.wantsEngine = true;
    t.state.snapshot = { isPlaying: false, positionSeconds: 7 };
    await t.handover.sync();

    assert.equal(t.calls.at(-1), 'engine@7:false');
  });

  it('drops the prepared engine when the microphone closed while preparing', async () => {
    const t = setup({
      prepareEngine: async () => {
        const test = createTestEngine();

        t.engines.push(test);
        t.state.wantsEngine = false;

        return test.engine;
      },
    });

    t.state.wantsEngine = true;
    await t.handover.sync();

    assert.deepEqual(t.calls, []);
    assert.equal(t.engines[0].state.disposed, true);
  });

  it('drops the prepared engine when another track became the active one', async () => {
    const t = setup({
      prepareEngine: async () => {
        const test = createTestEngine();

        t.engines.push(test);
        t.state.item = item('item-2');

        return test.engine;
      },
    });

    t.state.wantsEngine = true;
    await t.handover.sync();

    assert.deepEqual(t.calls, []);
    assert.equal(t.engines[0].state.disposed, true);
  });

  it('leaves the track on the media element and reports once when preparing fails', async () => {
    const failure = new Error('cannot decode');
    const t = setup({
      prepareEngine: async () => {
        throw failure;
      },
    });

    t.state.wantsEngine = true;
    await t.handover.sync();

    assert.deepEqual(t.calls, []);
    assert.deepEqual(t.stays, [failure]);
    assert.deepEqual(t.failures, []);
    assert.equal(t.state.kind, null);
  });

  it('says nothing when preparing was superseded by a newer load', async () => {
    const t = setup({
      prepareEngine: async () => {
        throw createAbortError();
      },
    });

    t.state.wantsEngine = true;
    await t.handover.sync();

    assert.deepEqual(t.failures, []);
    assert.deepEqual(t.stays, []);
  });
});

describe('listening hand-over to the media element', () => {
  it('moves a track off the engine at its position when the rule stops applying', async () => {
    const t = setup();

    t.state.kind = 'track';
    await t.handover.sync();

    assert.deepEqual(t.calls, ['element@42:true']);
  });

  it('leaves a composite on its engine', async () => {
    const t = setup();

    t.state.kind = 'composite';
    await t.handover.sync();

    assert.deepEqual(t.calls, []);
  });
});

describe('listening hand-over in general', () => {
  it('does nothing when the player already matches the rule', async () => {
    const t = setup();

    await t.handover.sync();
    t.state.wantsEngine = true;
    t.state.kind = 'track';
    await t.handover.sync();

    assert.deepEqual(t.calls, []);
  });

  it('does nothing without a track or while a load owns the player', async () => {
    const t = setup();

    t.state.wantsEngine = true;
    t.state.loadInFlight = true;
    await t.handover.sync();
    t.state.loadInFlight = false;
    t.state.item = null;
    await t.handover.sync();

    assert.deepEqual(t.calls, []);
  });

  it('runs one switch at a time and settles on the last state', async () => {
    const t = setup();

    t.state.wantsEngine = true;
    const first = t.handover.sync();

    t.state.wantsEngine = false;
    const second = t.handover.sync();

    await Promise.all([first, second, t.handover.whenSettled()]);

    assert.equal(t.state.kind, null);
  });
});
