/// <reference types="node" />

import assert from 'node:assert/strict';
import { describe, it } from 'node:test';

import { getDriveSourceLocationIssueCopy } from './drive-source-location-issue-copy.js';

describe('getDriveSourceLocationIssueCopy', () => {
  it('describes a deleted file', () => {
    assert.deepEqual(getDriveSourceLocationIssueCopy('missing'), {
      title: 'Original Drive location unavailable',
      message:
        'This file could not be found in Google Drive, so its current location cannot be opened.',
    });
  });

  it('describes a file with no accessible parent', () => {
    const copy = getDriveSourceLocationIssueCopy('no-accessible-parent');

    assert.equal(copy.title, 'Original Drive location unavailable');
    assert.match(copy.message, /no accessible Drive folder/);
  });

  it('describes an authorization failure distinctly from a generic failure', () => {
    const authIssue = getDriveSourceLocationIssueCopy('authorization-required');
    const unknownIssue = getDriveSourceLocationIssueCopy('unknown');

    assert.notEqual(authIssue.message, unknownIssue.message);
  });
});
