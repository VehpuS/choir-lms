import assert from 'node:assert/strict';
import { afterEach, describe, it } from 'node:test';

import {
  cleanup,
  fireEvent,
  render,
  screen,
} from '@testing-library/react-native/pure';

import { hasRenderedText } from '../../../../test-support/rendered-text';
import { getDriveSessionBannerCopy } from '../utils/drive-access-copy';
import { DriveSessionBanner } from './drive-session-banner';

const EXPIRED_COPY = getDriveSessionBannerCopy('expired');

describe('DriveSessionBanner', () => {
  afterEach(cleanup);

  it('shows the title and runs the action when it is pressed', () => {
    assert.ok(EXPIRED_COPY);
    const presses: number[] = [];

    render(
      <DriveSessionBanner
        copy={EXPIRED_COPY}
        onPressAction={() => presses.push(1)}
      />,
    );
    fireEvent.press(screen.getByLabelText('Reconnect'));

    assert.ok(hasRenderedText('Drive disconnected'));
    assert.deepEqual(presses, [1]);
  });

  it('shows no action when authorization cannot start', () => {
    assert.ok(EXPIRED_COPY);

    render(<DriveSessionBanner copy={EXPIRED_COPY} />);

    assert.ok(hasRenderedText('Drive disconnected'));
    assert.equal(screen.queryByLabelText('Reconnect'), null);
  });

  it('keeps the neutral Connect copy for a user who never signed in', () => {
    const copy = getDriveSessionBannerCopy('attention-required');

    assert.ok(copy);
    render(<DriveSessionBanner copy={copy} onPressAction={() => undefined} />);

    assert.ok(hasRenderedText('Connect Google Drive'));
    assert.ok(screen.getByLabelText('Connect'));
  });
});
