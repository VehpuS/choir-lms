import assert from 'node:assert/strict';
import { afterEach, describe, it } from 'node:test';

import {
  clearRecordingMix,
  getRecordingMixState,
  markRecordingMixSaved,
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
      savedBalance: 30,
    });
  });

  it('follows the slider and keeps it inside 0 to 100', () => {
    startRecordingMix('r1', 50);
    setRecordingMixBalance(120);

    assert.equal(getRecordingMixState().balance, 100);
  });

  it('moves the live balance without touching the saved one', () => {
    startRecordingMix('r1', 50);
    setRecordingMixBalance(80);

    assert.equal(getRecordingMixState().balance, 80);
    assert.equal(getRecordingMixState().savedBalance, 50);
  });

  it('keeps the live balance as the saved one on request', () => {
    startRecordingMix('r1', 50);
    setRecordingMixBalance(80);
    markRecordingMixSaved();

    assert.equal(getRecordingMixState().savedBalance, 80);
  });

  it('starts over at the saved balance when the recording plays again', () => {
    startRecordingMix('r1', 50);
    setRecordingMixBalance(80);
    startRecordingMix('r1', 50);

    assert.equal(getRecordingMixState().balance, 50);
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
      savedBalance: 50,
    });
  });
});
