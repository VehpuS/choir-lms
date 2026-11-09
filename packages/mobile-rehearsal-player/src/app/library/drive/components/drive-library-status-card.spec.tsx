import assert from 'node:assert/strict';
import { afterEach, describe, it } from 'node:test';

import {
  cleanup,
  fireEvent,
  render,
  screen,
} from '@testing-library/react-native/pure';

import { hasRenderedText } from '../../../../test-support/rendered-text';
import { DriveLibraryStatusCard } from './drive-library-status-card';

const STATUS = {
  message: 'There is not enough room on this device.',
  title: 'Could not play',
  tone: 'error' as const,
};

describe('DriveLibraryStatusCard action', () => {
  afterEach(cleanup);

  it('shows an action button under the message and runs it when pressed', () => {
    const presses: number[] = [];

    render(
      <DriveLibraryStatusCard
        action={{
          label: 'Clear offline files…',
          onPress: () => presses.push(1),
        }}
        isLoading={false}
        statusCopy={STATUS}
      />,
    );
    fireEvent.press(screen.getByLabelText('Clear offline files…'));

    assert.deepEqual(presses, [1]);
  });

  it('shows no button when the status has no action', () => {
    render(<DriveLibraryStatusCard isLoading={false} statusCopy={STATUS} />);

    assert.ok(hasRenderedText(STATUS.message));
    assert.equal(screen.queryByLabelText('Clear offline files…'), null);
  });
});
