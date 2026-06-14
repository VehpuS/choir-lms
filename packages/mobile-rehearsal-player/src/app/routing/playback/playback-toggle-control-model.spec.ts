/// <reference types="node" />

import assert from 'node:assert/strict';
import { describe, it } from 'node:test';

import { getPlaybackToggleControlModel } from './playback-toggle-control-model.js';

describe('playback toggle control model', () => {
  it('uses pause icon semantics for active playback on a titled surface', () => {
    assert.deepEqual(
      getPlaybackToggleControlModel({
        playbackToggleLabel: 'Pause',
        title: 'Warmups',
      }),
      {
        accessibilityLabel: 'Pause Warmups',
        iconName: 'pause',
        selected: true,
      },
    );
  });

  it('keeps play icon semantics for resume and replay states', () => {
    assert.deepEqual(
      getPlaybackToggleControlModel({
        playbackToggleLabel: 'Resume',
        title: 'Tenor Line.mp3',
      }),
      {
        accessibilityLabel: 'Resume Tenor Line.mp3',
        iconName: 'play',
        selected: false,
      },
    );

    assert.deepEqual(
      getPlaybackToggleControlModel({
        playbackToggleLabel: 'Replay',
        title: 'Entrance cue',
      }),
      {
        accessibilityLabel: 'Replay Entrance cue',
        iconName: 'play',
        selected: false,
      },
    );
  });

  it('falls back to current playback copy when the title is unavailable', () => {
    assert.deepEqual(
      getPlaybackToggleControlModel({
        playbackToggleLabel: '  ',
      }),
      {
        accessibilityLabel: 'Play current playback',
        iconName: 'play',
        selected: false,
      },
    );
  });
});
