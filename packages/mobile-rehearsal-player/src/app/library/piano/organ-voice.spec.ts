import assert from 'node:assert/strict';
import { describe, it } from 'node:test';

import { createFakeAudioContext } from './fake-audio-context.js';
import { createOrganVoice } from './organ-voice.js';

describe('organ voice', () => {
  it('sounds the key at concert pitch with a quick attack', () => {
    const context = createFakeAudioContext();
    const voice = createOrganVoice(context);

    voice.noteOn(69, 1);

    const [fundamental, second, third] = context.oscillators;

    assert.equal(fundamental.frequency.value, 440);
    assert.equal(second.frequency.value, 880);
    assert.equal(third.frequency.value, 1320);
    assert.equal(fundamental.startedAt, 0);

    const envelope = context.gains.find((gain) =>
      gain.gain.events.some((event) => event.kind === 'linear'),
    );

    assert.equal(envelope?.gain.events[1].time, 0.02);
  });

  it('fades out over the release and stops the oscillators after it', () => {
    const context = createFakeAudioContext();
    const note = createOrganVoice(context).noteOn(60, 1);

    context.currentTime = 4;
    note.release();
    note.release();

    const envelope = context.gains.find((gain) =>
      gain.gain.events.some((event) => event.kind === 'cancel'),
    );
    const ramps = envelope?.gain.events.filter(
      (event) => event.kind === 'linear',
    );

    assert.equal(ramps?.at(-1)?.value, 0);
    assert.ok(Math.abs((ramps?.at(-1)?.time ?? 0) - 4.12) < 1e-9);
    assert.equal(
      envelope?.gain.events.filter((event) => event.kind === 'cancel').length,
      1,
    );
    assert.ok(
      context.oscillators.every(
        (oscillator) => (oscillator.stoppedAt ?? 0) > 4.12,
      ),
    );
  });

  it('applies the volume to the master gain', () => {
    const context = createFakeAudioContext();
    const voice = createOrganVoice(context);

    voice.setVolume(0.3);

    assert.equal(context.gains[0].gain.value, 0.3);
    assert.deepEqual(context.gains[0].connections, [context.destination]);
  });

  it('releases every sounding note on dispose', () => {
    const context = createFakeAudioContext();
    const voice = createOrganVoice(context);

    voice.noteOn(60, 1);
    voice.noteOn(64, 1);
    voice.dispose();

    assert.ok(
      context.oscillators.every((oscillator) => oscillator.stoppedAt !== null),
    );
    assert.equal(context.gains[0].disconnected, true);
  });
});
