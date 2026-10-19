import assert from 'node:assert/strict';
import { describe, it } from 'node:test';

import { createFakeAudioContext } from './fake-audio-context.js';
import { createPianoSoundEngine } from './piano-sound-engine.js';

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
  });

  return {
    engine,
    contexts,
    change: (next: typeof current) => {
      current = next;
    },
  };
};

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

  it('applies the current volume at each press', () => {
    const { engine, contexts, change } = createHarness();

    engine.press(60);
    assert.equal(contexts[0].gains[0].gain.value, 0.5);

    change({ sound: 'organ', volume: 0.2 });
    engine.press(62);
    assert.equal(contexts[0].gains[0].gain.value, 0.2);
  });

  it('uses the sound chosen at the next press', () => {
    const { engine, contexts, change } = createHarness();

    engine.press(60);
    assert.equal(contexts[0].oscillators.length, 3);

    change({ sound: 'piano', volume: 0.5 });
    engine.press(62);
    assert.equal(contexts[0].oscillators.length, 3 + 6);
  });

  it('does nothing where no context can be created', () => {
    const engine = createPianoSoundEngine({
      createContext: () => null,
      getSettings: () => ({ sound: 'piano', volume: 1 }),
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
});
