import assert from 'node:assert/strict';
import { afterEach, describe, it } from 'node:test';

import { cleanup, render, screen } from '@testing-library/react-native/pure';

import { hasRenderedText } from '../../../test-support/rendered-text';
import {
  KEPT_OFFLINE_ACCESSIBILITY_LABEL,
  OfflineRowMarkView,
  resolveOfflineRowLeading,
} from './offline-row-mark';

describe('offline row mark', () => {
  afterEach(cleanup);

  it('marks only kept and downloading files, never automatic copies', () => {
    assert.equal(resolveOfflineRowLeading('none'), undefined);
    assert.equal(resolveOfflineRowLeading('available'), undefined);
    assert.notEqual(resolveOfflineRowLeading('kept'), undefined);
    assert.notEqual(resolveOfflineRowLeading('downloading'), undefined);
  });

  it('labels a kept file for screen readers', () => {
    render(<OfflineRowMarkView state="kept" />);

    assert.ok(screen.getByLabelText(KEPT_OFFLINE_ACCESSIBILITY_LABEL));
  });

  it('says Downloading… while the copy is fetched', () => {
    render(<OfflineRowMarkView state="downloading" />);

    assert.ok(hasRenderedText('Downloading…'));
  });
});
