import assert from 'node:assert/strict';
import { afterEach, describe, it } from 'node:test';

import {
  cleanup,
  fireEvent,
  render,
  screen,
} from '@testing-library/react-native/pure';

import { hasRenderedText } from '../../../../test-support/rendered-text';
import { RecordingBalanceSlider } from './recording-balance-slider';
import { RecordingLevelControl } from './recording-level-control';
import { RecordingMixLink } from './recording-mix-link';

describe('RecordingMixLink', () => {
  afterEach(cleanup);

  it('is a button named by its label that reports a press', () => {
    let presses = 0;

    render(
      <RecordingMixLink
        label="Normalize"
        onPress={() => {
          presses += 1;
        }}
      />,
    );
    fireEvent.press(screen.getByLabelText('Normalize'));

    assert.equal(presses, 1);
  });

  it('says it is disabled while its work runs', () => {
    render(
      <RecordingMixLink disabled label="Normalize" onPress={() => undefined} />,
    );

    // react-native-web reports the state as aria-disabled on the element.
    assert.equal(
      screen.getByLabelText('Normalize').props['aria-disabled'],
      true,
    );
  });
});

describe('the balance and level rows', () => {
  afterEach(cleanup);

  it('label the balance row and keep the track and recording ends', () => {
    render(<RecordingBalanceSlider onChange={() => undefined} value={50} />);

    assert.ok(hasRenderedText('Balance'));
    assert.ok(hasRenderedText('Track'));
    assert.ok(hasRenderedText('Mine'));
  });

  it('show the level with its readout, and Normalize and the extra action on one line', () => {
    render(
      <RecordingLevelControl
        extraActions={
          <RecordingMixLink label="Save as default" onPress={() => undefined} />
        }
        levelDb={4.5}
        onChange={() => undefined}
        recordingId="r1"
      />,
    );

    assert.ok(hasRenderedText('Level'));
    assert.ok(hasRenderedText('+4.5 dB'));
    assert.ok(screen.getByLabelText('Normalize'));
    assert.ok(screen.getByLabelText('Save as default'));
  });
});
