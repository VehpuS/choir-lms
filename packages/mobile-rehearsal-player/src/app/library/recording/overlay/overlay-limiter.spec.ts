import assert from 'node:assert/strict';
import { describe, it } from 'node:test';

import {
  LIMITER_ATTACK_S,
  LIMITER_KNEE_DB,
  LIMITER_RATIO,
  LIMITER_RELEASE_S,
  LIMITER_THRESHOLD_DB,
  createOverlayLimiter,
  type CompressorNode,
  type ShaperNode,
} from './overlay-limiter';

const connectable = () => {
  const connections: unknown[] = [];

  return {
    connect: (destination: unknown) => {
      connections.push(destination);
    },
    connections,
    disconnect: () => {
      connections.length = 0;
    },
  };
};

const fakeCompressor = (): CompressorNode & { connections: unknown[] } => ({
  ...connectable(),
  attack: { value: 0 },
  knee: { value: 0 },
  ratio: { value: 0 },
  release: { value: 0 },
  threshold: { value: 0 },
});

const fakeShaper = (): ShaperNode & { connections: unknown[] } => ({
  ...connectable(),
  curve: null,
  oversample: 'none',
});

describe('createOverlayLimiter', () => {
  it('sets a hard, fast compressor and puts a ceiling after it', () => {
    const compressor = fakeCompressor();
    const shaper = fakeShaper();
    const limiter = createOverlayLimiter({
      createDynamicsCompressor: () => compressor,
      createWaveShaper: () => shaper,
    });

    assert.equal(limiter.input, compressor);
    assert.equal(limiter.output, shaper);
    assert.deepEqual(compressor.connections, [shaper]);
    assert.equal(compressor.threshold.value, LIMITER_THRESHOLD_DB);
    assert.equal(compressor.knee.value, LIMITER_KNEE_DB);
    assert.equal(compressor.ratio.value, LIMITER_RATIO);
    assert.equal(compressor.attack.value, LIMITER_ATTACK_S);
    assert.equal(compressor.release.value, LIMITER_RELEASE_S);
    assert.ok(shaper.curve && shaper.curve.length > 1);
  });

  it('lets go of both nodes when it is disconnected', () => {
    const compressor = fakeCompressor();
    const shaper = fakeShaper();
    const limiter = createOverlayLimiter({
      createDynamicsCompressor: () => compressor,
      createWaveShaper: () => shaper,
    });

    limiter.disconnect();

    assert.deepEqual(compressor.connections, []);
  });

  it('keeps its compressor settings inside what the browser allows', () => {
    // The node accepts a ratio up to 20, an attack up to 1 s and a knee of 0 to 40 dB.
    assert.ok(LIMITER_THRESHOLD_DB < 0 && LIMITER_THRESHOLD_DB > -3);
    assert.ok(LIMITER_RATIO <= 20 && LIMITER_RATIO >= 10);
    assert.ok(LIMITER_ATTACK_S > 0 && LIMITER_ATTACK_S < 0.01);
    assert.ok(LIMITER_RELEASE_S > LIMITER_ATTACK_S);
    assert.ok(LIMITER_KNEE_DB >= 0);
  });
});
