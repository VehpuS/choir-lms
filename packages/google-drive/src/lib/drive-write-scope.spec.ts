import assert from 'node:assert/strict';
import { describe, it } from 'node:test';

import { DRIVE_WRITE_SCOPE, hasDriveWriteScope } from './drive-write-scope';

const READ_SCOPE = 'https://www.googleapis.com/auth/drive.readonly';

describe('hasDriveWriteScope', () => {
  it('is false when the scope is missing or empty', () => {
    assert.equal(hasDriveWriteScope(undefined), false);
    assert.equal(hasDriveWriteScope(''), false);
  });

  it('is false for a read-only session', () => {
    assert.equal(hasDriveWriteScope(READ_SCOPE), false);
  });

  it('is true for the write scope alone or combined with others', () => {
    assert.equal(hasDriveWriteScope(DRIVE_WRITE_SCOPE), true);
    assert.equal(
      hasDriveWriteScope(`openid ${READ_SCOPE}\n${DRIVE_WRITE_SCOPE}`),
      true,
    );
  });

  it('is true for the full Drive scope', () => {
    assert.equal(
      hasDriveWriteScope('https://www.googleapis.com/auth/drive'),
      true,
    );
  });

  it('does not match a scope that only contains the write scope as a prefix', () => {
    assert.equal(hasDriveWriteScope(`${DRIVE_WRITE_SCOPE}.metadata`), false);
  });
});
