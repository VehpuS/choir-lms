import assert from 'node:assert/strict';
import { afterEach, describe, it } from 'node:test';

import {
  clearRecordingMix,
  getRecordingMixState,
  setRecordingMixBalance,
  startRecordingMix,
} from './recording-mix-store.js';

afterEach(clearRecordingMix);

describe('recording mix store', () => {
  it('starts from the balance saved with the recording', () => {
    startRecordingMix('r1', 30);

    assert.deepEqual(getRecordingMixState(), {
      recordingId: 'r1',
      balance: 30,
    });
  });

  it('follows the slider and keeps it inside 0 to 100', () => {
    startRecordingMix('r1', 50);
    setRecordingMixBalance(120);

    assert.equal(getRecordingMixState().balance, 100);
  });

  it('ignores the slider when no recording is playing', () => {
    setRecordingMixBalance(10);

    assert.equal(getRecordingMixState().recordingId, null);
  });

  it('returns to the centre once cleared', () => {
    startRecordingMix('r1', 10);
    clearRecordingMix();

    assert.deepEqual(getRecordingMixState(), {
      recordingId: null,
      balance: 50,
    });
  });
});
