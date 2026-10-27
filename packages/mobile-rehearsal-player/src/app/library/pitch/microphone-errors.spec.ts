import assert from 'node:assert/strict';
import { describe, it } from 'node:test';

import {
  microphoneFailureReason,
  toPcmSourceError,
} from './microphone-errors.js';
import { PcmSourceError } from './pcm-source-types.js';

const named = (name: string) => Object.assign(new Error(name), { name });

describe('microphone errors', () => {
  it('maps a refused permission to denied', () => {
    assert.equal(microphoneFailureReason(named('NotAllowedError')), 'denied');
    assert.equal(microphoneFailureReason(named('SecurityError')), 'denied');
  });

  it('maps a busy device to in-use', () => {
    assert.equal(microphoneFailureReason(named('NotReadableError')), 'in-use');
  });

  it('maps a missing device and anything unknown to unavailable', () => {
    assert.equal(
      microphoneFailureReason(named('NotFoundError')),
      'unavailable',
    );
    assert.equal(microphoneFailureReason('boom'), 'unavailable');
  });

  it('keeps an existing PcmSourceError as it is', () => {
    const error = new PcmSourceError('in-use');

    assert.equal(toPcmSourceError(error), error);
  });
});
