import assert from 'node:assert/strict';
import { afterEach, describe, it } from 'node:test';

import { cleanup, fireEvent, render } from '@testing-library/react-native/pure';

import { MICROPHONE_COPY } from '../../library/pitch/microphone-choice/microphone-choice-model';
import { microphoneChoiceStore } from '../../library/pitch/microphone-choice/microphone-choice-store';
import { MicrophoneSection } from './microphone-section';

afterEach(cleanup);

const settle = async () => {
  await microphoneChoiceStore.hydrate();
  await new Promise((resolve) => setImmediate(resolve));
};

describe('MicrophoneSection', () => {
  it('lists Ask each time and Automatic, with the stored choice selected', async () => {
    await microphoneChoiceStore.set(null);
    const screen = render(<MicrophoneSection />);

    assert.ok(screen.getByLabelText(MICROPHONE_COPY.askLabel));
    assert.ok(screen.getByLabelText(MICROPHONE_COPY.automaticLabel));
    assert.equal(
      screen.getByLabelText(MICROPHONE_COPY.askLabel).props['aria-checked'],
      true,
    );
  });

  it('stores Automatic and clears it again with Ask each time', async () => {
    const screen = render(<MicrophoneSection />);

    fireEvent.press(screen.getByLabelText(MICROPHONE_COPY.automaticLabel));
    await settle();
    assert.deepEqual(microphoneChoiceStore.getSnapshot(), {
      kind: 'automatic',
    });

    fireEvent.press(screen.getByLabelText(MICROPHONE_COPY.askLabel));
    await settle();
    assert.equal(microphoneChoiceStore.getSnapshot(), null);
  });

  it('keeps a remembered input that is not connected, marked as such', async () => {
    await microphoneChoiceStore.set({
      kind: 'input',
      input: { deviceId: 'gone', label: 'Earbuds' },
    });
    const screen = render(<MicrophoneSection />);

    assert.ok(screen.getByLabelText('Earbuds (not connected)'));
    await microphoneChoiceStore.set(null);
  });
});
