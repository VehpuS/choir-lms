import assert from 'node:assert/strict';
import { describe, it } from 'node:test';

import {
  createOverlayLimiter,
  type LimiterContext,
  type LimiterHost,
  type ShaperNode,
} from './overlay-limiter';

const connectable = () => {
  const state = { disconnected: 0 };

  return {
    connect: () => undefined,
    disconnect: () => {
      state.disconnected += 1;
    },
    state,
  };
};

const fakeShaper = (): ShaperNode & { state: { disconnected: number } } => ({
  ...connectable(),
  curve: null,
  oversample: 'none',
});

const setUp = (
  options: { workletFails?: boolean; hasWorklet?: boolean } = {},
) => {
  const loaded: string[] = [];
  const shaper = fakeShaper();
  const node = connectable();
  const context: LimiterContext = {
    createWaveShaper: () => shaper,
    ...(options.hasWorklet === false
      ? {}
      : {
          audioWorklet: {
            addModule: async (url: string) => {
              if (options.workletFails) {
                throw new Error('blocked');
              }

              loaded.push(url);
            },
          },
        }),
  };
  const host: LimiterHost = {
    createLimiterNode: () => node,
    createModuleUrl: (source) => `blob:${source.length}`,
  };

  return { context, host, loaded, node, shaper };
};

describe('createOverlayLimiter', () => {
  it('runs the export limiter as a worklet, with no compressor in front', async () => {
    const t = setUp();
    const limiter = await createOverlayLimiter(t.context, t.host);

    assert.equal(limiter.input, t.node);
    assert.equal(limiter.output, t.node);
    assert.equal(t.loaded.length, 1);
    assert.equal(t.shaper.curve, null);
  });

  it('loads the processor once for a context', async () => {
    const t = setUp();

    await createOverlayLimiter(t.context, t.host);
    await createOverlayLimiter(t.context, t.host);

    assert.equal(t.loaded.length, 1);
  });

  it('falls back to the ceiling curve alone where worklets are missing or blocked', async () => {
    for (const options of [{ hasWorklet: false }, { workletFails: true }]) {
      const t = setUp(options);
      const limiter = await createOverlayLimiter(t.context, t.host);

      assert.equal(limiter.input, t.shaper);
      assert.ok(t.shaper.curve && t.shaper.curve.length > 1);
    }
  });

  it('lets go of its node when it is disconnected', async () => {
    const t = setUp();
    const limiter = await createOverlayLimiter(t.context, t.host);

    limiter.disconnect();

    assert.equal(t.node.state.disconnected, 1);
  });
});
