import assert from 'node:assert/strict';
import { afterEach, describe, it } from 'node:test';

import {
  clearRecordingSync,
  getRecordingSyncState,
  setRecordingNudge,
  startRecordingSync,
} from './recording-sync-store.js';

afterEach(clearRecordingSync);

describe('recording sync store', () => {
  it('starts from the nudge saved with the recording', () => {
    startRecordingSync('r1', 12);

    assert.deepEqual(getRecordingSyncState(), {
      recordingId: 'r1',
      nudgeMs: 12,
    });
  });

  it('keeps the nudge inside plus or minus 250', () => {
    startRecordingSync('r1', 0);
    setRecordingNudge(900);
    assert.equal(getRecordingSyncState().nudgeMs, 250);
    setRecordingNudge(-900);
    assert.equal(getRecordingSyncState().nudgeMs, -250);
  });

  it('ignores a move when no recording is playing', () => {
    setRecordingNudge(30);

    assert.equal(getRecordingSyncState().recordingId, null);
    assert.equal(getRecordingSyncState().nudgeMs, 0);
  });
});
