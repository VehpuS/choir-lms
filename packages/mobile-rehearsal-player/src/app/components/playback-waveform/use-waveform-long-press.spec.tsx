import assert from 'node:assert/strict';
import { afterEach, beforeEach, describe, it, mock } from 'node:test';

import { cleanup, renderHook } from '@testing-library/react-native/pure';

import {
  WAVEFORM_LONG_PRESS_MOVE_TOLERANCE,
  WAVEFORM_LONG_PRESS_MS,
  useWaveformLongPress,
} from './use-waveform-long-press';

describe('useWaveformLongPress', () => {
  beforeEach(() => {
    mock.timers.enable({ apis: ['setTimeout'] });
  });

  afterEach(() => {
    cleanup();
    mock.timers.reset();
  });

  it('fires once with the press origin after the hold time', () => {
    const pressed: number[] = [];
    const { result } = renderHook(() =>
      useWaveformLongPress({ onLongPress: (x) => pressed.push(x) }),
    );

    result.current.start(120);
    mock.timers.tick(WAVEFORM_LONG_PRESS_MS - 1);
    assert.deepEqual(pressed, []);

    mock.timers.tick(1);
    assert.deepEqual(pressed, [120]);
    assert.equal(result.current.hasFired(), true);
    // Releasing reports that it was a long press, so the release does not scrub.
    assert.equal(result.current.consumeFired(), true);
    assert.equal(result.current.consumeFired(), false);
  });

  it('is cancelled by releasing early', () => {
    const pressed: number[] = [];
    const { result } = renderHook(() =>
      useWaveformLongPress({ onLongPress: (x) => pressed.push(x) }),
    );

    result.current.start(50);
    mock.timers.tick(WAVEFORM_LONG_PRESS_MS - 10);

    assert.equal(result.current.consumeFired(), false);
    mock.timers.tick(100);
    assert.deepEqual(pressed, []);
  });

  it('is cancelled by travelling further than the tolerance', () => {
    const pressed: number[] = [];
    const { result } = renderHook(() =>
      useWaveformLongPress({ onLongPress: (x) => pressed.push(x) }),
    );

    result.current.start(50);
    result.current.move(50 + WAVEFORM_LONG_PRESS_MOVE_TOLERANCE + 1);
    mock.timers.tick(WAVEFORM_LONG_PRESS_MS + 100);

    assert.deepEqual(pressed, []);
  });

  it('survives a small wobble of the finger', () => {
    const pressed: number[] = [];
    const { result } = renderHook(() =>
      useWaveformLongPress({ onLongPress: (x) => pressed.push(x) }),
    );

    result.current.start(50);
    result.current.move(50 + WAVEFORM_LONG_PRESS_MOVE_TOLERANCE);
    mock.timers.tick(WAVEFORM_LONG_PRESS_MS);

    assert.deepEqual(pressed, [50]);
  });

  it('arms nothing without a handler', () => {
    const { result } = renderHook(() => useWaveformLongPress({}));

    result.current.start(50);
    mock.timers.tick(WAVEFORM_LONG_PRESS_MS + 100);

    assert.equal(result.current.hasFired(), false);
  });
});
