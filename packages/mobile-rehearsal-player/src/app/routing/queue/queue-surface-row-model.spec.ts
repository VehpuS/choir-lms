/// <reference types="node" />

import assert from 'node:assert/strict';
import { describe, it } from 'node:test';

import {
  getQueueRowPlaybackAction,
  getQueueRowPresentation,
} from './queue-surface-row-model.js';

describe('queue surface row model', () => {
  it('uses a pause button for the current playing queue item', () => {
    assert.deepEqual(
      getQueueRowPlaybackAction({
        isCurrent: true,
        playbackToggleLabel: 'Pause',
        title: 'Alto Line.mp3',
      }),
      {
        accessibilityLabel: 'Pause Alto Line.mp3',
        iconName: 'pause',
        pressBehavior: 'toggle-current',
        selected: true,
      },
    );
  });

  it('keeps play semantics for non-current queue items', () => {
    assert.deepEqual(
      getQueueRowPlaybackAction({
        isCurrent: false,
        playbackToggleLabel: 'Pause',
        title: 'Tenor Line.mp3',
      }),
      {
        accessibilityLabel: 'Play Tenor Line.mp3',
        iconName: 'play',
        pressBehavior: 'play-item',
        selected: false,
      },
    );
  });

  it('keeps the current row on toggle behavior even when playback is paused', () => {
    assert.deepEqual(
      getQueueRowPlaybackAction({
        isCurrent: true,
        playbackToggleLabel: 'Resume',
        title: 'Entrance cue',
      }),
      {
        accessibilityLabel: 'Resume Entrance cue',
        iconName: 'play',
        pressBehavior: 'toggle-current',
        selected: false,
      },
    );
  });

  it('uses current-row emphasis and control state instead of status copy', () => {
    assert.deepEqual(
      getQueueRowPresentation({
        isCurrent: true,
        playbackToggleLabel: 'Pause',
        title: 'Entrance cue',
      }),
      {
        emphasis: 'current',
        playbackAction: {
          accessibilityLabel: 'Pause Entrance cue',
          iconName: 'pause',
          pressBehavior: 'toggle-current',
          selected: true,
        },
      },
    );
  });

  it('keeps upcoming rows on default emphasis with direct play actions', () => {
    assert.deepEqual(
      getQueueRowPresentation({
        isCurrent: false,
        playbackToggleLabel: 'Pause',
        title: 'Tenor Line.mp3',
      }),
      {
        emphasis: 'upcoming',
        playbackAction: {
          accessibilityLabel: 'Play Tenor Line.mp3',
          iconName: 'play',
          pressBehavior: 'play-item',
          selected: false,
        },
      },
    );
  });
});
