/// <reference types="node" />

import assert from 'node:assert/strict';
import { describe, it } from 'node:test';

import { createPreparingTracker } from './preparing-tracker.js';

const createRecordingTracker = () => {
  const states: boolean[] = [];
  const tracker = createPreparingTracker((isPreparing) => {
    states.push(isPreparing);
  });

  return { states, tracker };
};

describe('preparing tracker', () => {
  it('stays preparing until every overlapping load settles', () => {
    const { states, tracker } = createRecordingTracker();

    tracker.setIsPreparing(true);
    tracker.setIsPreparing(true);
    tracker.setIsPreparing(false);

    assert.equal(states.at(-1), true);

    tracker.setIsPreparing(false);

    assert.equal(states.at(-1), false);
  });

  it('never counts below zero', () => {
    const { states, tracker } = createRecordingTracker();

    tracker.setIsPreparing(false);
    tracker.setIsPreparing(true);

    assert.equal(states.at(-1), true);
  });

  it('clears every pending load on reset', () => {
    const { states, tracker } = createRecordingTracker();

    tracker.setIsPreparing(true);
    tracker.setIsPreparing(true);
    tracker.reset();
    tracker.setIsPreparing(true);
    tracker.setIsPreparing(false);

    assert.equal(states.at(-1), false);
  });
});
