import assert from 'node:assert/strict';
import { afterEach, describe, it } from 'node:test';

import {
  clearRecordingMix,
  getRecordingMixState,
  markRecordingMixSaved,
  setRecordingMixBalanceFor,
  setRecordingMixLevel,
  setRecordingMixLevelFor,
  syncRecordingMixSaved,
  setRecordingMixBalance,
  startRecordingMix,
} from './recording-mix-store.js';

afterEach(clearRecordingMix);

describe('recording mix store', () => {
  it('starts from the balance saved with the recording', () => {
    startRecordingMix('r1', { savedBalance: 30 });

    assert.deepEqual(getRecordingMixState(), {
      recordingId: 'r1',
      balance: 30,
      savedBalance: 30,
      levelDb: 0,
      savedLevelDb: 0,
    });
  });

  it('follows the slider and keeps it inside 0 to 100', () => {
    startRecordingMix('r1', { savedBalance: 50 });
    setRecordingMixBalance(120);

    assert.equal(getRecordingMixState().balance, 100);
  });

  it('moves the live balance without touching the saved one', () => {
    startRecordingMix('r1', { savedBalance: 50 });
    setRecordingMixBalance(80);

    assert.equal(getRecordingMixState().balance, 80);
    assert.equal(getRecordingMixState().savedBalance, 50);
  });

  it('keeps the live balance as the saved one on request', () => {
    startRecordingMix('r1', { savedBalance: 50 });
    setRecordingMixBalance(80);
    markRecordingMixSaved();

    assert.equal(getRecordingMixState().savedBalance, 80);
  });

  it('starts over at the saved balance when the recording plays again', () => {
    startRecordingMix('r1', { savedBalance: 50 });
    setRecordingMixBalance(80);
    startRecordingMix('r1', { savedBalance: 50 });

    assert.equal(getRecordingMixState().balance, 50);
  });

  it('ignores the slider when no recording is playing', () => {
    setRecordingMixBalance(10);

    assert.equal(getRecordingMixState().recordingId, null);
  });

  it('returns to the centre once cleared', () => {
    startRecordingMix('r1', { savedBalance: 10 });
    clearRecordingMix();

    assert.deepEqual(getRecordingMixState(), {
      recordingId: null,
      balance: 50,
      savedBalance: 50,
      levelDb: 0,
      savedLevelDb: 0,
    });
  });

  it('can start at a balance that is not saved yet, for a preview', () => {
    startRecordingMix('r1', { savedBalance: 50, startBalance: 90 });

    assert.equal(getRecordingMixState().balance, 90);
    assert.equal(getRecordingMixState().savedBalance, 50);
  });

  it('moves only the recording that is playing', () => {
    startRecordingMix('r1', { savedBalance: 50 });
    setRecordingMixBalanceFor('other', 10);

    assert.equal(getRecordingMixState().balance, 50);

    setRecordingMixBalanceFor('r1', 10);

    assert.equal(getRecordingMixState().balance, 10);
  });

  it('notes a balance kept elsewhere without moving the live one', () => {
    startRecordingMix('r1', { savedBalance: 50 });
    setRecordingMixBalance(70);
    syncRecordingMixSaved('r1', { balance: 70 });
    syncRecordingMixSaved('other', { balance: 5 });

    assert.equal(getRecordingMixState().savedBalance, 70);
    assert.equal(getRecordingMixState().balance, 70);
  });

  it('starts at the saved level, or at one a preview asked to hear', () => {
    startRecordingMix('r1', { savedBalance: 50, savedLevelDb: 4 });

    assert.equal(getRecordingMixState().levelDb, 4);
    assert.equal(getRecordingMixState().savedLevelDb, 4);

    startRecordingMix('r1', {
      savedBalance: 50,
      savedLevelDb: 4,
      startLevelDb: 9,
    });

    assert.equal(getRecordingMixState().levelDb, 9);
    assert.equal(getRecordingMixState().savedLevelDb, 4);
  });

  it('moves the level for the session only, and keeps it with the balance on save', () => {
    startRecordingMix('r1', { savedBalance: 50 });
    setRecordingMixLevel(6);
    setRecordingMixBalance(70);

    assert.equal(getRecordingMixState().savedLevelDb, 0);

    markRecordingMixSaved();

    assert.deepEqual(
      [
        getRecordingMixState().savedBalance,
        getRecordingMixState().savedLevelDb,
      ],
      [70, 6],
    );
  });

  it('keeps the level inside its range and ignores a level for another recording', () => {
    startRecordingMix('r1', { savedBalance: 50 });
    setRecordingMixLevel(99);

    assert.equal(getRecordingMixState().levelDb, 18);

    setRecordingMixLevelFor('other', -5);

    assert.equal(getRecordingMixState().levelDb, 18);

    setRecordingMixLevelFor('r1', -5);

    assert.equal(getRecordingMixState().levelDb, -5);
  });

  it('takes a saved level from outside, such as the save sheet', () => {
    startRecordingMix('r1', { savedBalance: 50 });
    syncRecordingMixSaved('r1', { balance: 60, levelDb: 3 });

    assert.equal(getRecordingMixState().savedLevelDb, 3);
  });
});
