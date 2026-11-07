import assert from 'node:assert/strict';
import { afterEach, describe, it } from 'node:test';

import {
  clearActiveCompositeEngine,
  getActiveCompositeEngine,
  setActiveCompositeEngine,
  subscribeActiveCompositeEngine,
  subscribeCompositeEnded,
} from './active-composite.js';
import { createTestEngine } from './composite-test-engine.js';

afterEach(() => clearActiveCompositeEngine());

describe('active composite', () => {
  it('holds one engine and notifies when it changes', () => {
    const first = createTestEngine();
    let changes = 0;
    const stop = subscribeActiveCompositeEngine(() => (changes += 1));

    setActiveCompositeEngine(first.engine);
    setActiveCompositeEngine(first.engine);

    assert.equal(getActiveCompositeEngine(), first.engine);
    assert.equal(changes, 1);
    stop();
  });

  it('disposes the previous engine when another is set or it is cleared', () => {
    const first = createTestEngine();
    const second = createTestEngine();

    setActiveCompositeEngine(first.engine);
    setActiveCompositeEngine(second.engine);

    assert.equal(first.state.disposed, true);
    assert.equal(second.state.disposed, false);

    clearActiveCompositeEngine();

    assert.equal(second.state.disposed, true);
    assert.equal(getActiveCompositeEngine(), null);
  });

  it('announces the end once per play to the end, and not for a replaced engine', () => {
    const first = createTestEngine();
    const second = createTestEngine();
    let ended = 0;
    const stop = subscribeCompositeEnded(() => (ended += 1));

    setActiveCompositeEngine(first.engine);
    first.finish();
    first.emit();

    assert.equal(ended, 1);

    setActiveCompositeEngine(second.engine);
    first.finish();

    assert.equal(ended, 1);
    stop();
  });
});
