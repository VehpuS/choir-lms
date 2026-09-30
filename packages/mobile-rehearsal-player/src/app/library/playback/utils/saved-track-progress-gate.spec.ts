/// <reference types="node" />

import assert from 'node:assert/strict';
import { describe, it } from 'node:test';

import {
  EMPTY_SAVED_TRACK_PROGRESS,
  createSavedTrackProgressGateController,
  resolveGatedSavedTrackProgress,
  type SavedTrackProgress,
  type SavedTrackProgressGate,
} from './saved-track-progress-gate.js';

const previousItem: SavedTrackProgress = {
  buffered: 0,
  duration: 234.9,
  position: 39.7,
};
const newItem: SavedTrackProgress = {
  buffered: 0,
  duration: 85.7,
  position: 0.4,
};
const settled = (epoch: number): SavedTrackProgressGate => ({
  epoch,
  settled: true,
});

describe('saved track progress gate', () => {
  it('reports empty progress while a load is in flight, whatever the player says', () => {
    assert.equal(
      resolveGatedSavedTrackProgress({
        gate: { epoch: 2, settled: false },
        raw: previousItem,
        rawAtSettle: null,
        releasedEpoch: 1,
      }),
      EMPTY_SAVED_TRACK_PROGRESS,
    );
  });

  it('keeps hiding the previous item’s report after the load settles, until the player reports again', () => {
    assert.equal(
      resolveGatedSavedTrackProgress({
        gate: settled(2),
        raw: previousItem,
        rawAtSettle: previousItem,
        releasedEpoch: 1,
      }),
      EMPTY_SAVED_TRACK_PROGRESS,
    );
  });

  it('trusts the first changed report after settling', () => {
    assert.equal(
      resolveGatedSavedTrackProgress({
        gate: settled(2),
        raw: newItem,
        rawAtSettle: previousItem,
        releasedEpoch: 1,
      }),
      newItem,
    );
  });

  it('trusts an unchanged report once the release delay has passed', () => {
    assert.equal(
      resolveGatedSavedTrackProgress({
        gate: settled(2),
        raw: previousItem,
        rawAtSettle: previousItem,
        releasedEpoch: 2,
      }),
      previousItem,
    );
  });

  it('settles only the latest load, so a superseded one cannot release the gate', () => {
    const changes: SavedTrackProgressGate[] = [];
    const controller = createSavedTrackProgressGateController((gate) => {
      changes.push(gate);
    });
    const first = controller.begin();
    const second = controller.begin();

    controller.settle(first);
    assert.deepEqual(changes.at(-1), { epoch: second, settled: false });

    controller.settle(second);
    assert.deepEqual(changes.at(-1), { epoch: second, settled: true });
  });
});
