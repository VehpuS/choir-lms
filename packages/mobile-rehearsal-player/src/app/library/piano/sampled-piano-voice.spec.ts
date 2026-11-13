import assert from 'node:assert/strict';
import { afterEach, describe, it, mock } from 'node:test';

import { createFakeAudioContext } from './fake-audio-context.js';
import { SAMPLE_MIDIS } from './piano-samples.js';
import type { PianoVoice } from './piano-voice.js';
import {
  createSampledPianoVoice,
  LOAD_RETRY_MS,
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
  const voice = createSampledPianoVoice(context, {
    fallback: fallback.voice,
    loadSample: async (midi) => {
      loaded.push(midi);

      if (options.fails) {
        throw new Error('offline');
      }

      return new ArrayBuffer(8);
    },
  });

  return {
    context,
    fallback,
    loaded,
    voice,
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

  it('sounds a press made during the load at once, through the fallback', async () => {
    const { context, fallback, voice } = createVoice();

    voice.noteOn(60, 1);

    // Heard now, not queued behind the recordings and not dropped.
    assert.deepEqual(fallback.played, [60]);
    assert.equal(context.sources.length, 0);

    await voice.load();
  });

  it('plays from the recordings once they have arrived', async () => {
    const { context, fallback, voice } = createVoice();

    voice.noteOn(60, 1);
    await voice.load();
    voice.noteOn(64, 1);

    assert.deepEqual(fallback.played, [60]);
    assert.equal(context.sources.length, 1);
  });

  it('never loses a press however long the recordings take', async () => {
    const context = createFakeAudioContext();
    const fallback = createFallback();
    let arrive: () => void = () => undefined;
    const slow = new Promise<ArrayBuffer>((resolve) => {
      arrive = () => resolve(new ArrayBuffer(8));
    });
    const voice = createSampledPianoVoice(context, {
      fallback: fallback.voice,
      loadSample: () => slow,
    });

    // Several presses while nothing has arrived: every one of them sounds.
    voice.noteOn(60, 1);
    voice.noteOn(64, 1);
    voice.noteOn(67, 1);
    arrive();
    await voice.load();

    assert.deepEqual(fallback.played, [60, 64, 67]);
  });

  it('uses the fallback voice when the recordings cannot load', async () => {
    const { fallback, voice } = createVoice({ fails: true });

    voice.noteOn(60, 1);
    await voice.load();
    voice.noteOn(64, 1);

    assert.deepEqual(fallback.played, [60, 64]);
  });

  it('tries the recordings again after a failed load, but not at once', async () => {
    const context = createFakeAudioContext();
    const fallback = createFallback();
    let isOffline = true;
    let requests = 0;
    const voice = createSampledPianoVoice(context, {
      fallback: fallback.voice,
      loadSample: async () => {
        requests += 1;

        if (isOffline) {
          throw new Error('offline');
        }

        return new ArrayBuffer(8);
      },
    });
    let now = 1_000_000;

    mock.method(Date, 'now', () => now);
    await voice.load();
    const afterFirstTry = requests;

    // Straight away: no second storm of requests.
    voice.noteOn(60, 1);
    await voice.load();
    assert.equal(requests, afterFirstTry);

    // Later, with the network back, the next press tries again and then the
    // recordings are used.
    isOffline = false;
    now += LOAD_RETRY_MS + 1;
    voice.noteOn(62, 1);
    await voice.load();
    voice.noteOn(64, 1);

    assert.ok(requests > afterFirstTry);
    assert.equal(context.sources.length, 1);
  });
});
