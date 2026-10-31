import assert from 'node:assert/strict';
import { describe, it } from 'node:test';

import { resolveRecordingCapabilities } from './recording-capabilities.js';

const full = {
  hasMicrophoneApi: true,
  hasAudioWorklet: true,
  hasIndexedDb: true,
};

describe('recording capabilities', () => {
  it('records on web with a microphone, audio worklets, and IndexedDB', () => {
    assert.deepEqual(
      resolveRecordingCapabilities({ platformOs: 'web', ...full }),
      { canRecord: true },
    );
  });

  it('does not record on web when any one capability is missing', () => {
    for (const missing of Object.keys(full) as (keyof typeof full)[]) {
      assert.equal(
        resolveRecordingCapabilities({
          platformOs: 'web',
          ...full,
          [missing]: false,
        }).canRecord,
        false,
        missing,
      );
    }
  });

  it('does not record on native', () => {
    for (const platformOs of ['ios', 'android']) {
      assert.equal(
        resolveRecordingCapabilities({ platformOs, ...full }).canRecord,
        false,
      );
    }
  });
});
