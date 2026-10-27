import assert from 'node:assert/strict';
import { afterEach, describe, it } from 'node:test';

import {
  cleanup,
  renderHook,
  waitFor,
} from '@testing-library/react-native/pure';

import { useForgetSessionPrompt } from './use-forget-session-prompt';

describe('useForgetSessionPrompt', () => {
  afterEach(() => {
    cleanup();
  });

  it('forgets the session at once when no offline file is stored', async () => {
    let forgotten = 0;
    // Node has no browser storage, so the shared cache lists nothing.
    const { result } = renderHook(() =>
      useForgetSessionPrompt(() => {
        forgotten += 1;
      }),
    );

    result.current.requestForget();
    await waitFor(() => {
      assert.equal(forgotten, 1);
    });

    assert.equal(result.current.dialog, null);
  });
});
