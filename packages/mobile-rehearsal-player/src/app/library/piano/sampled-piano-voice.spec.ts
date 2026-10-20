import assert from 'node:assert/strict';
import { afterEach, describe, it, mock } from 'node:test';

import { createFakeAudioContext } from './fake-audio-context.js';
import { SAMPLE_MIDIS } from './piano-samples.js';
import type { PianoVoice } from './piano-voice.js';
import {
  createSampledPianoVoice,
  QUEUED_PRESS_LIMIT_MS,
} from './sampled-piano-voice.js';

const createFallback = () => {
  const played: number[] = [];
  const voice: PianoVoice = {
    load: async () => undefined,
    noteOn: (midi) => {
      played.push(midi);

      return { release: () => undefined };
    },
    setVolume: () => undefined,
    dispose: () => undefined,
  };

  return { played, voice };
};

const createVoice = (options: { fails?: boolean } = {}) => {
  const context = createFakeAudioContext();
  const fallback = createFallback();
  const loaded: number[] = [];
  let failures = 0;
  const voice = createSampledPianoVoice(context, {
    fallback: fallback.voice,
    loadSample: async (midi) => {
      loaded.push(midi);

      if (options.fails) {
        throw new Error('offline');
      }

      return new ArrayBuffer(8);
    },
    onLoadFailed: () => {
      failures += 1;
    },
  });

  return {
    context,
    fallback,
    loaded,
    voice,
    failures: () => failures,
  };
};

describe('sampled piano voice', () => {
  afterEach(() => {
    mock.restoreAll();
  });

  it('loads every recording once, however often it is asked', async () => {
    const { loaded, voice } = createVoice();

    await Promise.all([voice.load(), voice.load()]);

    assert.deepEqual(
      [...loaded].sort((a, b) => a - b),
      [...SAMPLE_MIDIS],
    );
  });

  it('plays a loaded key from the nearest recording at the shifted rate', async () => {
    const { context, voice } = createVoice();

    await voice.load();
    voice.noteOn(61, 1);

    const [source] = context.sources;

    assert.equal(context.sources.length, 1);
    assert.ok(source.buffer);
    assert.ok(Math.abs(source.playbackRate.value - 2 ** (1 / 12)) < 1e-9);
    assert.equal(source.startedAt, 0);
  });

  it('scales the note by velocity and the voice by volume', async () => {
    const { context, voice } = createVoice();

    await voice.load();
    voice.setVolume(0.4);
    voice.noteOn(60, 0.5);

    assert.equal(context.gains[0].gain.value, 0.4);
    assert.equal(
      context.gains[1].gain.events.find((event) => event.kind === 'linear')
        ?.value,
      0.25,
    );
  });

  it('fades a released note and stops its source', async () => {
    const { context, voice } = createVoice();

    await voice.load();
    context.currentTime = 1;

    const note = voice.noteOn(60, 1);

    context.currentTime = 2;
    note.release();
    note.release();

    const [source] = context.sources;
    const exponentials = context.gains[1].gain.events.filter(
      (event) => event.kind === 'exponential',
    );

    assert.equal(exponentials.length, 1);
    assert.equal(exponentials[0].time, 2.25);
    assert.ok((source.stoppedAt as number) > 2.25);
  });

  it('plays a press made during the load once the recordings arrive', async () => {
    const { context, voice } = createVoice();

    voice.noteOn(60, 1);

    assert.equal(context.sources.length, 0);

    await voice.load();
    await Promise.resolve();

    assert.equal(context.sources.length, 1);
  });

  it('drops a queued press that waited past the limit', async () => {
    const { context, voice } = createVoice();
    let now = 1_000_000;

    mock.method(Date, 'now', () => now);
    voice.noteOn(60, 1);
    now += QUEUED_PRESS_LIMIT_MS + 1;

    await voice.load();
    await Promise.resolve();

    assert.equal(context.sources.length, 0);
  });

  it('uses the fallback voice when the recordings cannot load', async () => {
    const { failures, fallback, voice } = createVoice({ fails: true });

    voice.noteOn(60, 1);
    await voice.load();
    await Promise.resolve();
    voice.noteOn(64, 1);

    assert.deepEqual(fallback.played, [60, 64]);
    assert.equal(failures(), 1);
  });
});
