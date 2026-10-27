import assert from 'node:assert/strict';
import { describe, it } from 'node:test';

import { resolvePitchCapabilities } from './pitch-capabilities.js';

const full = { hasMicrophoneApi: true, hasAudioWorklet: true };

describe('pitch capabilities', () => {
  it('listens on web with a microphone API and audio worklets', () => {
    assert.deepEqual(resolvePitchCapabilities({ platformOs: 'web', ...full }), {
      canListen: true,
    });
  });

  it('does not listen on web without a microphone API or audio worklets', () => {
    for (const missing of ['hasMicrophoneApi', 'hasAudioWorklet'] as const) {
      assert.equal(
        resolvePitchCapabilities({
          platformOs: 'web',
          ...full,
          [missing]: false,
        }).canListen,
        false,
      );
    }
  });

  it('does not listen on native', () => {
    for (const platformOs of ['ios', 'android']) {
      assert.equal(
        resolvePitchCapabilities({ platformOs, ...full }).canListen,
        false,
      );
    }
  });
});
