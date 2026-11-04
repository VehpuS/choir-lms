import assert from 'node:assert/strict';
import { afterEach, describe, it } from 'node:test';

import {
  cleanup,
  fireEvent,
  render,
  screen,
  waitFor,
} from '@testing-library/react-native/pure';

import { hasRenderedText } from '../../../../test-support/rendered-text';
import { RecordingMixPanel } from './recording-mix-panel';

describe('RecordingMixPanel', () => {
  afterEach(cleanup);

  it('starts open, as a button that says so, with no summary line', async () => {
    render(<RecordingMixPanel />);
    // The remembered state is read from storage, which fails in Node and falls back to open.
    await waitFor(() => {
      assert.ok(screen.getByLabelText('Balance and sync'));
    });

    const header = screen.getByLabelText('Balance and sync');

    assert.equal(header.props['aria-expanded'], true);
    assert.equal(hasRenderedText('Even · 0 dB · 0 ms'), false);
  });

  it('closes to one line with the summary, and opens again', async () => {
    render(<RecordingMixPanel />);
    // The remembered state is read from storage, which fails in Node and falls back to open.
    await waitFor(() => {
      assert.ok(screen.getByLabelText('Balance and sync'));
    });

    fireEvent.press(screen.getByLabelText('Balance and sync'));

    assert.equal(
      screen.getByLabelText('Balance and sync').props['aria-expanded'],
      false,
    );
    assert.ok(hasRenderedText('Even · 0 dB · 0 ms'));

    fireEvent.press(screen.getByLabelText('Balance and sync'));

    assert.equal(
      screen.getByLabelText('Balance and sync').props['aria-expanded'],
      true,
    );
  });
});
