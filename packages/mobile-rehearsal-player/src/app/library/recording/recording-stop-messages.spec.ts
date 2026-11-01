import assert from 'node:assert/strict';
import { describe, it } from 'node:test';

import type { RecordingStopReason } from './recorder-types.js';
import { describeRecordingStop } from './recording-stop-messages.js';

const reasons: RecordingStopReason[] = [
  'user',
  'hidden',
  'track-ended',
  'out-point',
  'interrupted',
  'microphone-ended',
  'storage-full',
  'storage-failed',
  'too-long',
];

describe('describeRecordingStop', () => {
  it('has a plain-words message for every stop reason', () => {
    for (const reason of reasons) {
      assert.ok(describeRecordingStop(reason).message.length > 10, reason);
    }
  });

  it('offers Export, as a warning, only when storage ran out or failed', () => {
    const offering = reasons.filter(
      (r) => describeRecordingStop(r).offerExport,
    );

    assert.deepEqual(offering, ['storage-full', 'storage-failed']);
    offering.forEach((r) =>
      assert.equal(describeRecordingStop(r).isProblem, true),
    );
  });

  it('calls a short ordinary take too short, but names a storage failure as the cause', () => {
    assert.match(
      describeRecordingStop('user', 'discarded').message,
      /too short/,
    );
    assert.match(
      describeRecordingStop('storage-failed', 'discarded').message,
      /storage failed/,
    );
    assert.equal(
      describeRecordingStop('storage-failed', 'discarded').offerExport,
      false,
    );
  });
});
