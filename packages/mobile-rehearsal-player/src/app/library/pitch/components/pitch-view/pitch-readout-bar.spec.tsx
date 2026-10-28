import assert from 'node:assert/strict';
import { afterEach, describe, it } from 'node:test';

import {
  cleanup,
  fireEvent,
  render,
  screen,
} from '@testing-library/react-native/pure';

import { hasRenderedText } from '../../../../../test-support/rendered-text';
import type { ReadoutBar } from '../../view/pitch-view-model';
import { PitchReadoutBar } from './pitch-readout-bar';

const bar = (patch: Partial<ReadoutBar> = {}): ReadoutBar => ({
  pitchText: 'A3',
  confidenceText: '92%',
  listenLabel: 'Stop',
  statusText: 'Listening',
  statusTone: 'ok',
  ...patch,
});

describe('PitchReadoutBar', () => {
  afterEach(cleanup);

  it('shows the pitch, confidence and state as text', () => {
    render(<PitchReadoutBar bar={bar()} onToggleListening={() => undefined} />);

    for (const text of ['A3', '92%', 'Listening']) {
      assert.ok(hasRenderedText(text), text);
    }
    assert.ok(screen.getByLabelText('State: Listening'));
  });

  it('names the toggle by what pressing it does', () => {
    const presses: number[] = [];

    render(
      <PitchReadoutBar
        bar={bar({ listenLabel: 'Listen', statusText: 'Not listening' })}
        onToggleListening={() => presses.push(1)}
      />,
    );
    fireEvent.press(screen.getByLabelText('Listen'));

    assert.deepEqual(presses, [1]);
  });

  it('says Stop while listening is on', () => {
    render(<PitchReadoutBar bar={bar()} onToggleListening={() => undefined} />);

    assert.ok(screen.getByLabelText('Stop'));
  });
});
