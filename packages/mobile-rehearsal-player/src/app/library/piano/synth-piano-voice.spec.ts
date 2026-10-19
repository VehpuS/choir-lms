import assert from 'node:assert/strict';
import { describe, it } from 'node:test';

import { createFakeAudioContext } from './fake-audio-context.js';
import { createSynthPianoVoice } from './synth-piano-voice.js';

describe('synth piano voice', () => {
  it('starts the fundamental at concert pitch with stretched upper partials', () => {
    const context = createFakeAudioContext();

    createSynthPianoVoice(context).noteOn(69, 1);

    const [first, second] = context.oscillators;

    assert.equal(context.oscillators.length, 6);
    assert.ok(Math.abs(first.frequency.value - 440) < 0.5);
    assert.ok(second.frequency.value > 880);
    assert.ok(second.frequency.value < 884);
  });

  it('lets higher partials and higher notes die away sooner', () => {
    const context = createFakeAudioContext();
    const voice = createSynthPianoVoice(context);

    voice.noteOn(48, 1);
    voice.noteOn(96, 1);

    const decayEnd = (gainIndex: number) => {
      return context.gains[gainIndex].gain.events.find(
        (event) => event.kind === 'exponential',
      )?.time as number;
    };
    // Gain order: master, then per note an envelope followed by its partials.
    const lowFundamental = decayEnd(2);
    const lowSecond = decayEnd(3);
    const highFundamental = decayEnd(9);

    assert.ok(lowSecond < lowFundamental);
    assert.ok(highFundamental < lowFundamental);
  });

  it('fades over 250 ms on release and releases once', () => {
    const context = createFakeAudioContext();
    const note = createSynthPianoVoice(context).noteOn(60, 1);

    context.currentTime = 3;
    note.release();
    note.release();

    const envelope = context.gains[1];
    const fades = envelope.gain.events.filter(
      (event) => event.kind === 'exponential',
    );

    assert.equal(fades.length, 1);
    assert.ok(Math.abs(fades[0].time - 3.25) < 1e-9);
  });

  it('applies the volume to the master gain and disposes cleanly', () => {
    const context = createFakeAudioContext();
    const voice = createSynthPianoVoice(context);

    voice.setVolume(0.4);
    voice.noteOn(60, 1);
    voice.dispose();

    assert.equal(context.gains[0].gain.value, 0.4);
    assert.ok(
      context.oscillators.every((oscillator) => oscillator.stoppedAt !== null),
    );
  });
});
