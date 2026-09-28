import assert from 'node:assert/strict';
import { describe, it } from 'node:test';

import { throwIfDriveRequestAborted } from './drive-abort';

describe('throwIfDriveRequestAborted', () => {
  it('does nothing without a signal or before the signal aborts', () => {
    assert.doesNotThrow(() => {
      throwIfDriveRequestAborted(undefined);
      throwIfDriveRequestAborted(new AbortController().signal);
    });
  });

  it('throws a named AbortError once the signal has aborted', () => {
    const abortController = new AbortController();
    abortController.abort();

    assert.throws(
      () => {
        throwIfDriveRequestAborted(abortController.signal, 'Stopped.');
      },
      { message: 'Stopped.', name: 'AbortError' },
    );
  });
});
