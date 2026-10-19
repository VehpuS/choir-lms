import assert from 'node:assert/strict';
import { describe, it } from 'node:test';

import { resolvePianoCapabilities } from './piano-capabilities.js';

describe('piano capabilities', () => {
  it('plays on web with Web Audio', () => {
    assert.deepEqual(
      resolvePianoCapabilities({ platformOs: 'web', hasAudioContext: true }),
      { canPlay: true },
    );
  });

  it('does not play on web without Web Audio', () => {
    assert.equal(
      resolvePianoCapabilities({ platformOs: 'web', hasAudioContext: false })
        .canPlay,
      false,
    );
  });

  it('does not play on native', () => {
    for (const platformOs of ['ios', 'android']) {
      assert.equal(
        resolvePianoCapabilities({ platformOs, hasAudioContext: true }).canPlay,
        false,
      );
    }
  });
});
