import assert from 'node:assert/strict';
import { describe, it } from 'node:test';

import { describeAllowSavingStep } from './allow-saving-step-model.js';

describe('describeAllowSavingStep', () => {
  it('is ready when the session can already save', () => {
    assert.deepEqual(
      describeAllowSavingStep({
        hasAskedForPermission: false,
        hasWriteAccess: true,
      }),
      { state: 'ready' },
    );
  });

  it('asks for permission the first time, naming what saving allows', () => {
    const step = describeAllowSavingStep({
      hasAskedForPermission: false,
      hasWriteAccess: false,
    });

    assert.equal(step.state, 'needs-permission');
    assert.ok('title' in step && step.title === 'Allow saving to Drive');
    assert.ok(
      'message' in step && /only change files it added/.test(step.message),
    );
  });

  it('says the permission was not granted after the user went through the screen without it', () => {
    const step = describeAllowSavingStep({
      hasAskedForPermission: true,
      hasWriteAccess: false,
    });

    assert.equal(step.state, 'declined');
    assert.ok('message' in step && /not granted/.test(step.message));
  });

  it('is ready once permission arrives, even after a decline', () => {
    assert.deepEqual(
      describeAllowSavingStep({
        hasAskedForPermission: true,
        hasWriteAccess: true,
      }),
      { state: 'ready' },
    );
  });
});
