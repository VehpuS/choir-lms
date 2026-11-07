import assert from 'node:assert/strict';
import { afterEach, describe, it } from 'node:test';

import { act, cleanup, renderHook } from '@testing-library/react-native/pure';

import {
  clearActiveCompositeEngine,
  setActiveCompositeEngine,
} from './active-composite.js';
import { createTestEngine } from './composite-test-engine.js';
import {
  useActiveCompositeEngine,
  useCompositeEnded,
  useCompositeEngineState,
  useCompositeProgress,
} from './use-active-composite.js';

afterEach(() => {
  cleanup();
  clearActiveCompositeEngine();
});

describe('active composite hooks', () => {
  it('follows the active engine and its state', () => {
    const test = createTestEngine();
    const { result } = renderHook(() => {
      const engine = useActiveCompositeEngine();

      return { engine, state: useCompositeEngineState(engine) };
    });

    assert.equal(result.current.engine, null);
    assert.equal(result.current.state, undefined);

    act(() => setActiveCompositeEngine(test.engine));

    assert.equal(result.current.engine, test.engine);
    assert.equal(result.current.state, 'paused');

    act(() => {
      test.engine.play();
      test.emit();
    });

    assert.equal(result.current.state, 'playing');
  });

  it('reports progress in seconds and refreshes it on a seek', () => {
    const test = createTestEngine(60_000);
    const { result } = renderHook(() =>
      useCompositeProgress(test.engine, 60_000),
    );

    assert.equal(result.current?.duration, 60);

    act(() => {
      test.state.positionMs = 12_000;
      test.emit();
    });

    assert.equal(result.current?.position, 12);
  });

  it('has no progress without an engine', () => {
    const { result } = renderHook(() => useCompositeProgress(null, 1000));

    assert.equal(result.current, undefined);
  });

  it('calls the handler when the composite plays to its end', () => {
    const test = createTestEngine();
    let ended = 0;

    renderHook(() => useCompositeEnded(() => (ended += 1)));
    act(() => {
      setActiveCompositeEngine(test.engine);
      test.finish();
    });

    assert.equal(ended, 1);
  });
});
