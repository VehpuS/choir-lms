import assert from 'node:assert/strict';
import { describe, it } from 'node:test';

import { createDriveDiscoveryRequest } from './drive-discovery-request.js';

describe('createDriveDiscoveryRequest', () => {
  it('aborts in-flight work and rejects late results after disposal', () => {
    const request = createDriveDiscoveryRequest();

    assert.equal(request.signal.aborted, false);
    assert.equal(request.shouldApplyResult(), true);

    request.dispose();

    assert.equal(request.signal.aborted, true);
    assert.equal(request.shouldApplyResult(), false);
  });
});
