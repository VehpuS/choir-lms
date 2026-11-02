import assert from 'node:assert/strict';
import { afterEach, describe, it } from 'node:test';

import {
  requestRecordingPreview,
  setPendingPreviewBalance,
  subscribeToRecordingPreview,
  takePendingPreviewBalance,
  type RecordingPreviewRequest,
} from './recording-preview-request.js';

const unsubscribers: Array<() => void> = [];

afterEach(() => {
  unsubscribers.splice(0).forEach((unsubscribe) => unsubscribe());
});

describe('recording preview request', () => {
  it('delivers a request to every listener until it unsubscribes', () => {
    const seen: RecordingPreviewRequest[] = [];
    const unsubscribe = subscribeToRecordingPreview((request) =>
      seen.push(request),
    );

    unsubscribers.push(unsubscribe);
    requestRecordingPreview({ kind: 'play', recordingId: 'r1', balance: 80 });
    unsubscribe();
    requestRecordingPreview({ kind: 'stop', recordingId: 'r1' });

    assert.deepEqual(seen, [{ kind: 'play', recordingId: 'r1', balance: 80 }]);
  });

  it('hands a pending preview balance over once', () => {
    setPendingPreviewBalance('r1', 90);

    assert.equal(takePendingPreviewBalance('r1'), 90);
    assert.equal(takePendingPreviewBalance('r1'), undefined);
  });

  it('keeps each recording’s pending balance apart', () => {
    setPendingPreviewBalance('r1', 10);
    setPendingPreviewBalance('r2', 20);

    assert.equal(takePendingPreviewBalance('r2'), 20);
    assert.equal(takePendingPreviewBalance('r1'), 10);
  });
});
