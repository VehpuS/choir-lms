import assert from 'node:assert/strict';
import { describe, it } from 'node:test';

import { createFakeAudioContext } from './fake-audio-context.js';
import { createPianoSoundEngine } from './piano-sound-engine.js';

// The recordings are never fetched here (see sampled-piano-voice.spec.ts).
const loadSample = async () => new ArrayBuffer(8);

const createHarness = (settings = { sound: 'organ', volume: 0.5 } as const) => {
  const contexts: ReturnType<typeof createFakeAudioContext>[] = [];
  let current: { sound: 'piano' | 'organ'; volume: number } = { ...settings };
  const engine = createPianoSoundEngine({
    createContext: () => {
      const context = createFakeAudioContext();

      contexts.push(context);

      return context;
    },
    getSettings: () => current,
    loadSample,
  });

  return {
    engine,
    contexts,
    change: (next: typeof current) => {
      current = next;
    },
  };
};

// A new context resumes asynchronously, so a press sounds a tick later.
const untilRunning = () =>
  new Promise<void>((resolve) => setTimeout(resolve, 0));

describe('piano sound engine', () => {
  it('creates and resumes the context only at the first press', () => {
    const { engine, contexts } = createHarness();

    assert.equal(contexts.length, 0);

    engine.press(60);
    engine.press(62);

    assert.equal(contexts.length, 1);
    assert.equal(contexts[0].resumeCalls, 1);
  });

  it('tracks sounding keys as new sets and notifies subscribers', () => {
    const { engine } = createHarness();
    let notified = 0;

    engine.subscribe(() => {
      notified += 1;
    });
    engine.press(60);

    const afterPress = engine.getSounding();

    engine.press(60);
    engine.release(60);

    assert.deepEqual([...afterPress], [60]);
    assert.deepEqual([...engine.getSounding()], []);
    assert.equal(notified, 2);
  });

  it('applies the current volume at each press', async () => {
    const { engine, contexts, change } = createHarness();

    engine.press(60);
    await untilRunning();
    assert.equal(contexts[0].gains[0].gain.value, 0.5);

    change({ sound: 'organ', volume: 0.2 });
    engine.press(62);
    await untilRunning();
    assert.equal(contexts[0].gains[0].gain.value, 0.2);
  });

  it('uses the sound chosen at the next press', async () => {
    const { engine, contexts, change } = createHarness();

    engine.press(60);
    await untilRunning();
    assert.equal(contexts[0].oscillators.length, 3);

    change({ sound: 'piano', volume: 0.5 });
    engine.press(62);
    await untilRunning();
    await untilRunning();
    // The piano plays a recording, not oscillators; the organ's three stay.
    assert.equal(contexts[0].oscillators.length, 3);
    assert.equal(contexts[0].sources.length, 1);
  });

  it('does nothing where no context can be created', () => {
    const engine = createPianoSoundEngine({
      createContext: () => null,
      getSettings: () => ({ sound: 'piano', volume: 1 }),
      loadSample,
    });

    engine.press(60);

    assert.equal(engine.getSounding().size, 0);
  });

  it('closes the context and clears notes on dispose', () => {
    const { engine, contexts } = createHarness();

    engine.press(60);
    engine.dispose();

    assert.equal(contexts[0].state, 'closed');
    assert.equal(engine.getSounding().size, 0);
  });

  describe('when the browser has not unlocked audio yet', () => {
    const createBlocked = () => {
      const contexts: ReturnType<typeof createFakeAudioContext>[] = [];
      const engine = createPianoSoundEngine({
        createContext: () => {
          const context = createFakeAudioContext({ blockResume: true });

          contexts.push(context);

          return context;
        },
        getSettings: () => ({ sound: 'organ', volume: 0.5 }),
        loadSample,
      });

      return { engine, contexts };
    };
    const settle = () => new Promise<void>((resolve) => setTimeout(resolve, 0));

    it('shows the key held but makes no sound until audio starts', () => {
      const { engine, contexts } = createBlocked();

      engine.press(60);

      assert.deepEqual([...engine.getSounding()], [60]);
      assert.equal(contexts[0].oscillators.length, 0);
    });

    it('sounds a held key once a later gesture lets audio start', async () => {
      const { engine, contexts } = createBlocked();

      engine.press(60);
      contexts[0].allowStart();
      await settle();

      assert.equal(contexts[0].oscillators.length, 3);
      assert.deepEqual([...engine.getSounding()], [60]);

      engine.release(60);
      assert.deepEqual([...engine.getSounding()], []);
    });

    it('still sounds a tap that ended before audio started', async () => {
      const { engine, contexts } = createBlocked();

      engine.press(60);
      engine.release(60);
      assert.deepEqual([...engine.getSounding()], []);

      contexts[0].allowStart();
      await settle();

      assert.equal(contexts[0].oscillators.length, 3);
      // The short note is released after its minimum, not left ringing.
      await new Promise((resolve) => setTimeout(resolve, 260));
      assert.ok(contexts[0].oscillators.every((o) => o.stoppedAt !== null));
    });

    it('starts the context from a gesture before any key is pressed', async () => {
      const { engine, contexts } = createBlocked();

      engine.prime();
      contexts[0].allowStart();
      await settle();
      engine.press(64);

      assert.equal(contexts[0].oscillators.length, 3);
    });
  });
});
