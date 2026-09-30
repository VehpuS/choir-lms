/// <reference types="node" />

import assert from 'node:assert/strict';
import { describe, it } from 'node:test';

import { getQueueRowPresentation } from './queue-surface-row-model.js';

describe('queue surface row model', () => {
  it('toggles the current queue item and reports it as playing while it plays', () => {
    assert.deepEqual(
      getQueueRowPresentation({
        isCurrent: true,
        playbackToggleLabel: 'Pause',
        title: 'Alto Line.mp3',
      }),
      {
        accessibilityLabel: 'Pause Alto Line.mp3',
        emphasis: 'current',
        pressBehavior: 'toggle-current',
        statusLabel: 'Playing',
      },
    );
  });

  it('reports the current queue item as paused when the toggle would play it', () => {
    const presentation = getQueueRowPresentation({
      isCurrent: true,
      playbackToggleLabel: 'Resume',
      title: 'Alto Line.mp3',
    });

    assert.equal(presentation.accessibilityLabel, 'Resume Alto Line.mp3');
    assert.equal(presentation.statusLabel, 'Paused');
    assert.equal(presentation.pressBehavior, 'toggle-current');
  });

  it('reports the current queue item as loading rather than paused while it loads', () => {
    const presentation = getQueueRowPresentation({
      isCurrent: true,
      isLoading: true,
      playbackToggleLabel: 'Play',
      title: 'Alto Line.mp3',
    });

    assert.equal(presentation.statusLabel, 'Loading');
  });

  it('starts a non-current queue item when its row is tapped, with no status', () => {
    assert.deepEqual(
      getQueueRowPresentation({
        isCurrent: false,
        playbackToggleLabel: 'Pause',
        title: 'Tenor Line.mp3',
      }),
      {
        accessibilityLabel: 'Play Tenor Line.mp3',
        emphasis: 'upcoming',
        pressBehavior: 'play-item',
        statusLabel: null,
      },
    );
  });

  it('ignores the loading flag for a queue item that is not current', () => {
    const presentation = getQueueRowPresentation({
      isCurrent: false,
      isLoading: true,
      playbackToggleLabel: 'Play',
      title: 'Tenor Line.mp3',
    });

    assert.equal(presentation.statusLabel, null);
  });
});
