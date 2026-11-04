import assert from 'node:assert/strict';
import { describe, it } from 'node:test';

import type { PunchPhase } from '@org/audio-mixing';

import type { RecordingStopReason } from '../recorder-types';
import { createPunchRecorder } from './punch-recorder';

const setUp = (phase: PunchPhase) => {
  const calls: string[] = [];
  const recorder = createPunchRecorder({
    getPhase: () => phase,
    start: () => calls.push('start'),
    stop: (reason: RecordingStopReason) => calls.push(`stop:${reason}`),
  });

  return { calls, recorder };
};

describe('createPunchRecorder', () => {
  it('starts the take', () => {
    const { calls, recorder } = setUp('recording');

    recorder.start();

    assert.deepEqual(calls, ['start']);
  });

  it('stops with the out point as the reason when the range ended it', () => {
    const { calls, recorder } = setUp('stopped-at-out');

    recorder.stop();

    assert.deepEqual(calls, ['stop:out-point']);
  });

  it('stops as the user when it was stopped early', () => {
    const { calls, recorder } = setUp('stopped-early');

    recorder.stop();

    assert.deepEqual(calls, ['stop:user']);
  });
});
