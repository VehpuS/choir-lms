import assert from 'node:assert/strict';
import { describe, it } from 'node:test';

import {
  requestClearOfflineFiles,
  subscribeToClearOfflineFilesRequests,
} from './clear-offline-files-request';

describe('clear offline files requests', () => {
  it('delivers the request, with its retry, until the host leaves', () => {
    const received: Array<(() => void) | undefined> = [];
    const unsubscribe = subscribeToClearOfflineFilesRequests((request) => {
      received.push(request.onCleared);
    });
    const retry = () => undefined;

    requestClearOfflineFiles({ onCleared: retry });
    requestClearOfflineFiles();
    unsubscribe();
    requestClearOfflineFiles({ onCleared: retry });

    assert.deepEqual(received, [retry, undefined]);
  });
});
