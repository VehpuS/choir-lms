import assert from 'node:assert/strict';
import { describe, it } from 'node:test';

import {
  createCompositeAwarePlayer,
  toPlayerProgress,
  toPlayerState,
} from './composite-aware-player.js';
import { createTestEngine } from './composite-test-engine.js';

const STATES = {
  Ended: 'ended',
  Paused: 'paused',
  Playing: 'playing',
} as const;

const createBase = () => {
  const calls: string[] = [];
  const base = {
    marker: 'base',
    play: async function (this: unknown) {
      calls.push(`play:${(this as { marker: string }).marker}`);
    },
    pause: async () => void calls.push('pause'),
    seekTo: async (seconds: number) => void calls.push(`seekTo:${seconds}`),
    setVolume: async (volume: number) => void calls.push(`setVolume:${volume}`),
    getProgress: async () => ({ position: 1, duration: 2, buffered: 2 }),
    getPlaybackState: async () => ({ state: 'ready' }),
    reset: async () => void calls.push('reset'),
    skipToNext: async () => void calls.push('skipToNext'),
  };

  return { base, calls };
};

const setup = () => {
  const { base, calls } = createBase();
  const test = createTestEngine(90_000);
  const holder: { engine: typeof test.engine | null } = { engine: null };
  let cleared = 0;
  const player = createCompositeAwarePlayer(base, {
    getActiveEngine: () => holder.engine,
    clearActiveEngine: () => {
      cleared += 1;
      holder.engine = null;
    },
    states: STATES,
  });

  return { player, calls, test, holder, cleared: () => cleared };
};

describe('composite-aware player', () => {
  it('delegates everything to the wrapped player while no composite is active', async () => {
    const { player, calls } = setup();

    await player.play();
    await player.seekTo(5);

    assert.deepEqual(calls, ['play:base', 'seekTo:5']);
    assert.deepEqual(await player.getPlaybackState(), { state: 'ready' });
  });

  it('routes the transport calls to the active engine and not to the wrapped player', async () => {
    const { player, calls, test, holder } = setup();

    holder.engine = test.engine;
    await player.play();
    await player.seekTo(12.5);
    await player.setVolume(0.4);
    await player.pause();

    assert.deepEqual(calls, []);
    assert.deepEqual(test.calls, [
      ['play'],
      ['seek', 12_500],
      ['setVolume', 0.4],
      ['pause'],
    ]);
  });

  it('reports progress in seconds and the state through the library enum', async () => {
    const { player, test, holder } = setup();

    holder.engine = test.engine;
    test.state.positionMs = 30_000;
    await player.play();

    assert.deepEqual(await player.getProgress(), {
      position: 30,
      duration: 90,
      buffered: 90,
    });
    assert.deepEqual(await player.getPlaybackState(), { state: 'playing' });

    test.finish();

    assert.deepEqual(await player.getPlaybackState(), { state: 'ended' });
  });

  it('routes rate and volume reads to the engine', async () => {
    const { player, test, holder } = setup();

    holder.engine = test.engine;
    await (
      player as never as { setRate: (r: number) => Promise<void> }
    ).setRate(0.7);

    assert.equal(
      await (player as never as { getRate: () => Promise<number> }).getRate(),
      0.7,
    );
    assert.equal(
      await (
        player as never as { getVolume: () => Promise<number> }
      ).getVolume(),
      1,
    );
  });

  it('delegates calls the engine does not own, such as queue navigation', async () => {
    const { player, calls, test, holder } = setup();

    holder.engine = test.engine;
    await player.skipToNext();

    assert.deepEqual(calls, ['skipToNext']);
  });

  it('clears the composite on reset and still resets the wrapped player', async () => {
    const { player, calls, test, holder, cleared } = setup();

    holder.engine = test.engine;
    await player.reset();

    assert.equal(cleared(), 1);
    assert.deepEqual(calls, ['reset']);

    await player.play();

    assert.deepEqual(calls, ['reset', 'play:base']);
  });

  it('stops by pausing and rewinding the engine', async () => {
    const { player, test, holder } = setup();

    holder.engine = test.engine;
    await (player as never as { stop: () => Promise<void> }).stop();

    assert.deepEqual(test.calls, [['pause'], ['seek', 0]]);
  });
});

describe('player state and progress mapping', () => {
  it('maps the three engine states', () => {
    assert.equal(toPlayerState('playing', STATES), 'playing');
    assert.equal(toPlayerState('paused', STATES), 'paused');
    assert.equal(toPlayerState('ended', STATES), 'ended');
  });

  it('converts milliseconds to seconds', () => {
    const { engine, state } = createTestEngine(4000);

    state.positionMs = 1500;

    assert.deepEqual(toPlayerProgress(engine), {
      position: 1.5,
      duration: 4,
      buffered: 4,
    });
  });
});
