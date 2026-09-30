/// <reference types="node" />

import assert from 'node:assert/strict';
import { describe, it } from 'node:test';

import {
  getNowPlayingKicker,
  getNowPlayingTimelineLabels,
  getNowPlayingTransportControls,
} from './now-playing-model.js';

describe('now playing model', () => {
  it('names the queue in the kicker only for queued playback', () => {
    assert.equal(getNowPlayingKicker(true), 'Rehearsing queue');
    assert.equal(getNowPlayingKicker(false), 'Rehearsing');
  });

  it('shows queue navigation around the current-item controls in a queue', () => {
    assert.deepEqual(getNowPlayingTransportControls(true), [
      'previous-item',
      'seek-backward',
      'toggle-playback',
      'seek-forward',
      'next-item',
    ]);
  });

  it('hides queue-only controls for standalone playback', () => {
    assert.deepEqual(getNowPlayingTransportControls(false), [
      'seek-backward',
      'toggle-playback',
      'seek-forward',
    ]);
  });

  it('shows elapsed and remaining time', () => {
    assert.deepEqual(
      getNowPlayingTimelineLabels({ elapsedSeconds: 89, totalSeconds: 278 }),
      { elapsed: '1:29', remaining: '−3:09' },
    );
  });

  it('clamps elapsed time into the known duration', () => {
    assert.deepEqual(
      getNowPlayingTimelineLabels({ elapsedSeconds: 300, totalSeconds: 278 }),
      { elapsed: '4:38', remaining: '−0:00' },
    );
  });

  it('falls back to zero labels while the duration is unknown', () => {
    assert.deepEqual(
      getNowPlayingTimelineLabels({ elapsedSeconds: 12, totalSeconds: 0 }),
      { elapsed: '0:00', remaining: '−0:00' },
    );
  });
});
