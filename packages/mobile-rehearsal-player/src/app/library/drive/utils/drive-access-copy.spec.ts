import assert from 'node:assert/strict';
import { describe, it } from 'node:test';

import {
  getDriveSessionBannerCopy,
  getSourceAccessChip,
} from './drive-access-copy';

const unavailable = (reason?: string) => {
  return { availability: { status: 'unavailable', reason } } as never;
};

describe('Drive session banner copy', () => {
  it('shows nothing while connected', () => {
    assert.equal(getDriveSessionBannerCopy('authorized'), null);
  });

  it('offers Reconnect with a warning tone once the session expired', () => {
    assert.deepEqual(getDriveSessionBannerCopy('expired'), {
      actionLabel: 'Reconnect',
      title: 'Drive disconnected',
      tone: 'warning',
    });
  });

  it('offers a neutral Connect when the user never signed in', () => {
    const copy = getDriveSessionBannerCopy('attention-required');

    assert.equal(copy?.actionLabel, 'Connect');
    assert.equal(copy?.tone, 'neutral');
  });

  it('keeps every title and action short enough for one line on a phone', () => {
    for (const status of ['expired', 'attention-required'] as const) {
      const copy = getDriveSessionBannerCopy(status);

      assert.ok((copy?.title.length ?? 0) <= 24);
      assert.ok((copy?.actionLabel.length ?? 0) <= 10);
    }
  });
});

describe('Source access chip', () => {
  it('maps each file-level reason to a short label', () => {
    assert.equal(
      getSourceAccessChip(unavailable('needs-access'))?.label,
      'Needs access',
    );
    assert.equal(
      getSourceAccessChip(unavailable('missing'))?.label,
      'Not found',
    );
    assert.equal(
      getSourceAccessChip(unavailable('access-revoked'))?.label,
      'Access removed',
    );
    assert.equal(getSourceAccessChip(unavailable('network'))?.label, 'Offline');
  });

  it('keeps chip labels within 14 characters', () => {
    for (const reason of [
      'needs-access',
      'missing',
      'access-revoked',
      'network',
    ]) {
      assert.ok(
        (getSourceAccessChip(unavailable(reason))?.label.length ?? 99) <= 14,
      );
    }
  });

  it('gives no chip to an available row or a reason without a short label', () => {
    assert.equal(
      getSourceAccessChip({ availability: { status: 'available' } } as never),
      null,
    );
    assert.equal(getSourceAccessChip(unavailable('unknown')), null);
    assert.equal(getSourceAccessChip(unavailable()), null);
  });
});
