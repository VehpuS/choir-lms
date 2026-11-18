import assert from 'node:assert/strict';
import { afterEach, describe, it } from 'node:test';

import {
  isListeningEngineOffForTest,
  setListeningEngineOffForTest,
  subscribeListeningOverride,
} from './listening-override';

afterEach(() => setListeningEngineOffForTest(false));

describe('listening test override', () => {
  it('is off until set, and tells subscribers only when it changes', () => {
    let changes = 0;
    const stop = subscribeListeningOverride(() => (changes += 1));

    assert.equal(isListeningEngineOffForTest(), false);

    setListeningEngineOffForTest(true);
    setListeningEngineOffForTest(true);
    setListeningEngineOffForTest(false);

    assert.equal(changes, 2);
    stop();
  });
});
