import assert from 'node:assert/strict';
import { afterEach, describe, it } from 'node:test';

import {
  cleanup,
  fireEvent,
  render,
  screen,
} from '@testing-library/react-native/pure';

import { hasRenderedText } from '../../../../../test-support/rendered-text';
import type { ViewReadout } from '../../view/pitch-view-model';
import { PitchReadout } from './pitch-readout';

describe('PitchReadout', () => {
  afterEach(cleanup);

  it('shows the note, its distance and the zone in words, as one labelled value', () => {
    const readout: ViewReadout = {
      kind: 'note',
      name: 'A3',
      distanceText: '+8 cents',
      zone: 'precise',
      zoneLabel: 'Precise',
      spokenLabel: 'A3, +8 cents, Precise',
    };

    render(<PitchReadout onAction={() => undefined} readout={readout} />);

    assert.ok(screen.getByLabelText('A3, +8 cents, Precise'));
    assert.ok(hasRenderedText('Precise'));
    assert.ok(hasRenderedText('+8 cents'));
  });

  it('shows the idle prompt with no button', () => {
    render(
      <PitchReadout
        onAction={() => undefined}
        readout={{ kind: 'idle', title: 'Listening', detail: 'sing a note' }}
      />,
    );

    assert.ok(hasRenderedText('Listening'));
    assert.equal(screen.queryByLabelText('Listen'), null);
  });

  it('shows a blocked microphone with its action, which reports its kind', () => {
    const pressed: string[] = [];

    render(
      <PitchReadout
        onAction={(kind) => pressed.push(kind)}
        readout={{
          kind: 'message',
          title: 'Microphone blocked.',
          detail: 'Allow it, then press “Listen”.',
          tone: 'warning',
          action: { kind: 'listen', label: 'Listen' },
        }}
      />,
    );
    fireEvent.press(screen.getByLabelText('Listen'));

    assert.ok(hasRenderedText('Microphone blocked.'));
    assert.deepEqual(pressed, ['listen']);
  });

  it('shows a plain message with no button when nothing can be done', () => {
    render(
      <PitchReadout
        onAction={() => undefined}
        readout={{
          kind: 'message',
          title: 'Paused.',
          detail: 'It resumes on its own.',
          tone: 'neutral',
          action: null,
        }}
      />,
    );

    assert.equal(screen.queryByLabelText('Listen'), null);
    assert.equal(screen.queryByLabelText('Continue'), null);
  });
});
