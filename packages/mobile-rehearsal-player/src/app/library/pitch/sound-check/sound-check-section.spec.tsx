import assert from 'node:assert/strict';
import { afterEach, describe, it } from 'node:test';

import { cleanup, fireEvent, render } from '@testing-library/react-native/pure';

import { hasRenderedText } from '../../../../test-support/rendered-text';
import { SOUND_CHECK_COPY } from './sound-check-model';
import { SoundCheckSection } from './sound-check-section';

afterEach(cleanup);

describe('SoundCheckSection', () => {
  it('lists the three test sounds, the microphone and the four session types', () => {
    const screen = render(<SoundCheckSection />);

    for (const label of [
      SOUND_CHECK_COPY.webAudioNew,
      SOUND_CHECK_COPY.webAudioApp,
      SOUND_CHECK_COPY.mediaElement,
      SOUND_CHECK_COPY.microphone,
      'Session: auto',
      'Session: playback',
      'Session: play-and-record',
      'Session: ambient',
    ]) {
      assert.ok(screen.getByLabelText(label), label);
    }

    assert.ok(hasRenderedText('Sound check'));
  });

  it('reads out what the page sees, even where the browser has no audio session', () => {
    const screen = render(<SoundCheckSection />);

    assert.ok(screen.getByLabelText('Sound check readout'));
    assert.ok(hasRenderedText('Microphone open: no'));
    assert.ok(hasRenderedText('Session type: not available in this browser'));
  });

  it('shows the switches off until pressed, and survives a press where the browser cannot play', () => {
    const screen = render(<SoundCheckSection />);
    const toggle = screen.getByLabelText(SOUND_CHECK_COPY.webAudioNew);

    assert.equal(toggle.props['aria-checked'], false);
    fireEvent.press(toggle);
    assert.equal(
      screen.getByLabelText(SOUND_CHECK_COPY.webAudioNew).props['aria-checked'],
      false,
    );
  });
});
