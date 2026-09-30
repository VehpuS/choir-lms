/// <reference types="node" />

import assert from 'node:assert/strict';
import { describe, it } from 'node:test';

import {
  createSavedTrackProgressGateController,
  type SavedTrackProgressGate,
} from '../saved-track-progress-gate.js';
import { createSavedTrackPlaybackRuntimeCore } from './runtime-core.js';
import type { SavedTrackPlaybackControllerOptions } from './shared.js';

const createCore = () => {
  const gates: SavedTrackProgressGate[] = [];
  const progressGate = createSavedTrackProgressGateController((gate) => {
    gates.push(gate);
  });
  // The load gate only reads `progressGate`; the rest is not reached here.
  const core = createSavedTrackPlaybackRuntimeCore({
    progressGate,
  } as unknown as SavedTrackPlaybackControllerOptions);

  return { core, gates };
};

describe('playback runtime load gate', () => {
  it('opens the progress gate for a load and settles it when the load ends', async () => {
    const { core, gates } = createCore();

    await core.runAsLoad(async () => {
      assert.equal(core.isLoadInFlight(), true);
      assert.deepEqual(gates.at(-1), { epoch: 1, settled: false });
    });

    assert.equal(core.isLoadInFlight(), false);
    assert.deepEqual(gates.at(-1), { epoch: 1, settled: true });
  });

  it('settles the gate even when the load fails', async () => {
    const { core, gates } = createCore();

    await assert.rejects(
      core.runAsLoad(async () => {
        throw new Error('download failed');
      }),
      /download failed/,
    );

    assert.equal(core.isLoadInFlight(), false);
    assert.deepEqual(gates.at(-1), { epoch: 1, settled: true });
  });

  it('keeps the gate closed until the newest of overlapping loads finishes', async () => {
    const { core, gates } = createCore();
    let releaseFirst = () => undefined as void;
    const first = core.runAsLoad(() => {
      return new Promise<void>((resolve) => {
        releaseFirst = resolve;
      });
    });
    const second = core.runAsLoad(async () => undefined);

    await second;
    assert.deepEqual(gates.at(-1), { epoch: 2, settled: true });

    releaseFirst();
    await first;

    // The superseded load finishing later must not reopen or re-settle epoch 1.
    assert.deepEqual(gates.at(-1), { epoch: 2, settled: true });
    assert.equal(core.isLoadInFlight(), false);
  });

  it('reports no live snapshot while a load owns the player', async () => {
    const { core } = createCore();

    await core.runAsLoad(async () => {
      assert.equal(await core.readLivePlaybackSnapshot(), null);
    });
  });
});
