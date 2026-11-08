import assert from 'node:assert/strict';
import { describe, it } from 'node:test';

import type { CompositeMix, CompositeStem } from '@org/audio-library-models';
import type { PcmWindowReader } from '@org/audio-mixing';

import { createTestEngine } from '../playback/composite-test-engine';
import {
  loadCompositeEngineFromStems,
  NO_STEMS_LOADED_MESSAGE,
} from './load-composite-engine';
import type { LoadStem } from './composite-stem-loader';

const reader = (durationMs: number): PcmWindowReader => ({
  sampleRate: 8000,
  sampleCount: Math.round((durationMs / 1000) * 8000),
  durationMs,
  read: async () => new Float32Array(0),
});

const stem = (id: string, offsetMs = 0): CompositeStem => ({
  id,
  trackId: `track-${id}`,
  name: id,
  offsetMs,
  mine: false,
});

const mix = (levels: CompositeMix['levels']): CompositeMix => ({ levels });

const setup = (failing: string[] = []) => {
  const built: Array<{
    stems: Array<{ id: string; offsetMs: number }>;
    initialGains: Record<string, number>;
  }> = [];
  const failures: string[][] = [];
  const loadStem: LoadStem = async ({ stemId }) => {
    if (failing.includes(stemId)) {
      throw new Error('missing');
    }

    return reader(1000);
  };
  const composite = {
    stems: [stem('a'), stem('b', 250), stem('c')],
    defaultMix: mix({
      b: { volume: 50, muted: false, soloed: false },
      c: { volume: 100, muted: true, soloed: false },
    }),
  };
  const run = (
    overrides: Partial<Parameters<typeof loadCompositeEngineFromStems>[0]> = {},
  ) =>
    loadCompositeEngineFromStems({
      composite,
      loadStem,
      createEngine: (options) => {
        built.push({
          stems: options.stems.map(({ id, offsetMs }) => ({ id, offsetMs })),
          initialGains: options.initialGains,
        });

        return createTestEngine().engine;
      },
      onStemsFailed: (failed) => failures.push(failed.map((f) => f.stemId)),
      ...overrides,
    });

  return { built, failures, run };
};

describe('loadCompositeEngineFromStems', () => {
  it('builds the engine with every stem, its offset and the default mix as gains', async () => {
    const t = setup();

    await t.run();

    assert.deepEqual(t.built[0].stems, [
      { id: 'a', offsetMs: 0 },
      { id: 'b', offsetMs: 250 },
      { id: 'c', offsetMs: 0 },
    ]);
    assert.deepEqual(t.built[0].initialGains, { a: 1, b: 0.5, c: 0 });
    assert.deepEqual(t.failures, []);
  });

  it('starts from the mix given instead of the default', async () => {
    const t = setup();

    await t.run({
      initialMix: mix({ a: { volume: 100, muted: false, soloed: true } }),
    });

    assert.deepEqual(t.built[0].initialGains, { a: 1, b: 0, c: 0 });
  });

  it('plays the stems that loaded and reports the ones that did not', async () => {
    const t = setup(['b']);

    await t.run();

    assert.deepEqual(
      t.built[0].stems.map((s) => s.id),
      ['a', 'c'],
    );
    assert.deepEqual(t.built[0].initialGains, { a: 1, c: 0 });
    assert.deepEqual(t.failures, [['b']]);
  });

  it('does not load when no stem could be loaded', async () => {
    const t = setup(['a', 'b', 'c']);

    await assert.rejects(t.run(), new RegExp(NO_STEMS_LOADED_MESSAGE));
    assert.equal(t.built.length, 0);
    assert.deepEqual(t.failures, [['a', 'b', 'c']]);
  });
});
