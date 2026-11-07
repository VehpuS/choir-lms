import assert from 'node:assert/strict';
import { afterEach, describe, it } from 'node:test';

import { createCompositePlayableItem } from '@org/audio-library-models';

import {
  clearActiveCompositeEngine,
  getActiveCompositeEngine,
} from './active-composite.js';
import { createTestEngine } from './composite-test-engine.js';
import {
  loadCompositeEngine,
  setCompositeEngineLoader,
} from './composite-engine-loader.js';
import { loadCompositeItemIntoPlayer } from './load-composite-item.js';

const item = createCompositePlayableItem(
  {
    id: 'c1',
    name: 'Ubi caritas',
    createdAt: 'now',
    stems: [
      { id: 's1', trackId: 't1', name: 'S', offsetMs: 0, mine: false },
      { id: 's2', trackId: 't2', name: 'B', offsetMs: 0, mine: false },
    ],
  },
  { durationMs: 60_000 },
);

afterEach(() => {
  clearActiveCompositeEngine();
  setCompositeEngineLoader(null);
});

describe('loadCompositeItemIntoPlayer', () => {
  it('resets the player, activates the engine, then seeks, sets the volume and plays', async () => {
    const order: string[] = [];
    const test = createTestEngine(60_000);

    await loadCompositeItemIntoPlayer({
      item,
      player: { reset: async () => void order.push('reset') },
      loadEngine: async () => {
        order.push('load');

        return test.engine;
      },
      volume: 0.6,
      initialPositionSeconds: 12,
      shouldPlay: true,
    });

    assert.deepEqual(order, ['reset', 'load']);
    assert.equal(getActiveCompositeEngine(), test.engine);
    assert.deepEqual(test.calls, [
      ['setVolume', 0.6],
      ['seek', 12_000],
      ['play'],
    ]);
  });

  it('applies the session shaping after activating the engine and before it plays', async () => {
    const test = createTestEngine();

    await loadCompositeItemIntoPlayer({
      item,
      player: { reset: async () => undefined },
      loadEngine: async () => test.engine,
      volume: 1,
      initialPositionSeconds: 0,
      shouldPlay: true,
      applyShaping: async () => {
        assert.equal(getActiveCompositeEngine(), test.engine);
        test.engine.setRate(0.7);
      },
    });

    assert.deepEqual(test.calls, [
      ['setVolume', 1],
      ['setRate', 0.7],
      ['play'],
    ]);
  });

  it('loads paused and from the start when asked', async () => {
    const test = createTestEngine();

    await loadCompositeItemIntoPlayer({
      item,
      player: { reset: async () => undefined },
      loadEngine: async () => test.engine,
      volume: 1,
      initialPositionSeconds: 0,
      shouldPlay: false,
    });

    assert.deepEqual(test.calls, [['setVolume', 1]]);
  });

  it('leaves nothing active when the engine cannot be built', async () => {
    const previous = createTestEngine();

    await loadCompositeItemIntoPlayer({
      item,
      player: { reset: async () => undefined },
      loadEngine: async () => previous.engine,
      volume: 1,
      initialPositionSeconds: 0,
      shouldPlay: false,
    });
    // The wrapped player's reset clears the active engine; the fake does it by hand.
    clearActiveCompositeEngine();

    await assert.rejects(
      loadCompositeItemIntoPlayer({
        item,
        player: { reset: async () => clearActiveCompositeEngine() },
        loadEngine: async () => {
          throw new Error('stems failed');
        },
        volume: 1,
        initialPositionSeconds: 0,
        shouldPlay: true,
      }),
      /stems failed/,
    );
    assert.equal(getActiveCompositeEngine(), null);
  });
});

describe('loadCompositeEngine', () => {
  it('fails with the unavailable message until a loader is registered', async () => {
    await assert.rejects(loadCompositeEngine(item, {}), /web for now/);
  });

  it('hands the item to the registered loader', async () => {
    const test = createTestEngine();

    setCompositeEngineLoader(async () => test.engine);

    assert.equal(await loadCompositeEngine(item, {}), test.engine);
  });
});
