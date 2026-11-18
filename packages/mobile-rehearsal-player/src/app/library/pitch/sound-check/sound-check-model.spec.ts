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
  trackPlayer: 'engine-track',
  rule: {
    isMicrophoneOpen: true,
    isRecordingToolOpen: false,
    isAppHidden: false,
  },
  trackFallback: null,
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
      'Track player: web audio engine (single track)',
      'Listening rule: microphone yes, recording tool no, app hidden no',
      'Track could not be prepared: no',
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

  it('says where the track is and why it stayed on the media element', () => {
    const lines = describeReadout({
      ...base,
      trackPlayer: 'media-element',
      rule: {
        isMicrophoneOpen: true,
        isRecordingToolOpen: true,
        isAppHidden: true,
      },
      trackFallback: 'no-room',
    });

    assert.equal(lines[6], 'Track player: media element');
    assert.equal(
      lines[7],
      'Listening rule: microphone yes, recording tool yes, app hidden yes',
    );
    assert.equal(lines[8], 'Track could not be prepared: no-room');
    assert.equal(
      describeReadout({ ...base, trackPlayer: 'engine-composite' })[6],
      'Track player: web audio engine (composite)',
    );
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
