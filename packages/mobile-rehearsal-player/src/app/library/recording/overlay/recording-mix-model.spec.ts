import assert from 'node:assert/strict';
import { describe, it } from 'node:test';

import { describeBalance, getRecordingMix } from './recording-mix-model.js';

describe('recording mix', () => {
  it('silences the track when the balance is fully on the recording', () => {
    assert.deepEqual(getRecordingMix({ balance: 100, volumeLevel: 1 }), {
      volumeShare: 0,
      trackVolume: 0,
      recordingLevel: 1,
    });
  });

  it('silences the recording when the balance is fully on the track', () => {
    assert.deepEqual(getRecordingMix({ balance: 0, volumeLevel: 1 }), {
      volumeShare: 1,
      trackVolume: 1,
      recordingLevel: 0,
    });
  });

  it('plays both at the same level when centred', () => {
    assert.deepEqual(getRecordingMix({ balance: 50, volumeLevel: 1 }), {
      volumeShare: 1,
      trackVolume: 1,
      recordingLevel: 1,
    });
  });

  it('scales both sides by the playback volume so the balance never changes how loud the pair is', () => {
    assert.deepEqual(getRecordingMix({ balance: 50, volumeLevel: 0.4 }), {
      volumeShare: 1,
      trackVolume: 0.4,
      recordingLevel: 0.4,
    });
    assert.deepEqual(getRecordingMix({ balance: 75, volumeLevel: 0.5 }), {
      volumeShare: 0.5,
      trackVolume: 0.25,
      recordingLevel: 0.5,
    });
  });

  it('mutes both when the volume is muted', () => {
    assert.deepEqual(getRecordingMix({ balance: 30, volumeLevel: 0 }), {
      volumeShare: 1,
      trackVolume: 0,
      recordingLevel: 0,
    });
  });

  it('keeps an out-of-range or invalid balance inside the slider', () => {
    assert.equal(
      getRecordingMix({ balance: 500, volumeLevel: 1 }).trackVolume,
      0,
    );
    assert.equal(
      getRecordingMix({ balance: -5, volumeLevel: 1 }).recordingLevel,
      0,
    );
    assert.deepEqual(getRecordingMix({ balance: Number.NaN, volumeLevel: 1 }), {
      volumeShare: 1,
      trackVolume: 1,
      recordingLevel: 1,
    });
  });

  it('names the extremes and the centre for a screen reader', () => {
    assert.equal(describeBalance(0), 'Track only');
    assert.equal(describeBalance(100), 'Recording only');
    assert.equal(describeBalance(50), 'Even');
    assert.equal(describeBalance(70), '70 out of 100 toward the recording');
  });
});
