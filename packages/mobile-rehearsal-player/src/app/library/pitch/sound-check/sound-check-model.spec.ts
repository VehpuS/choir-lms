import assert from 'node:assert/strict';
import { describe, it } from 'node:test';

import {
  describeReadout,
  formatContext,
  levelDb,
  type SoundCheckReadout,
} from './sound-check-model';

const base: SoundCheckReadout = {
  sessionType: 'play-and-record',
  isCapturing: true,
  microphone: { sampleRate: 48_000, levelDb: -31 },
  appContext: { state: 'running', sampleRate: 48_000, outputLatency: 0.12 },
  testContext: null,
  isMediaElementPlaying: false,
};

describe('describeReadout', () => {
  it('gives one line for each fact the page can see', () => {
    assert.deepEqual(describeReadout(base), [
      'Session type: play-and-record',
      'Microphone open: yes',
      'Capture: 48000 Hz, level -31 dB',
      'App audio context: running, 48000 Hz, output latency 120 ms',
      'Test audio context: none',
      'Media element sound: off',
    ]);
  });

  it('says so when the browser has no audio session or no capture is running', () => {
    const lines = describeReadout({
      ...base,
      sessionType: null,
      isCapturing: false,
      microphone: null,
      appContext: null,
      isMediaElementPlaying: true,
    });

    assert.equal(lines[0], 'Session type: not available in this browser');
    assert.equal(lines[1], 'Microphone open: no');
    assert.equal(lines[2], 'Capture: off');
    assert.equal(lines[3], 'App audio context: none');
    assert.equal(lines[5], 'Media element sound: playing');
  });

  it('calls a silent capture silent', () => {
    assert.equal(
      describeReadout({
        ...base,
        microphone: { sampleRate: 16_000, levelDb: null },
      })[2],
      'Capture: 16000 Hz, level silent',
    );
  });
});

describe('formatContext', () => {
  it('leaves out a latency the browser does not report', () => {
    assert.equal(
      formatContext({ state: 'suspended', sampleRate: 44_100 }),
      'suspended, 44100 Hz',
    );
  });
});

describe('levelDb', () => {
  it('reads a full-scale square wave as 0 dB and half of it as about -6 dB', () => {
    assert.equal(levelDb([1, -1, 1, -1]), 0);
    assert.equal(levelDb([0.5, -0.5, 0.5, -0.5]), -6);
  });

  it('is null for silence or no samples', () => {
    assert.equal(levelDb([0, 0, 0]), null);
    assert.equal(levelDb([]), null);
  });
});
