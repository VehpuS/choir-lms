/// <reference types="node" />

import assert from 'node:assert/strict';
import { describe, it } from 'node:test';

import {
  getNowPlayingKicker,
  getNowPlayingTransportAppearance,
  getNowPlayingTimelineLabels,
  getNowPlayingTransportControls,
} from './now-playing-model.js';
import { appTheme } from '../../../utils/theme.js';

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

  it('draws only play / pause as the accent ring', () => {
    const controls = getNowPlayingTransportControls(true);

    assert.deepEqual(
      controls.filter((control) => {
        return getNowPlayingTransportAppearance(control).ring;
      }),
      ['toggle-playback'],
    );
    assert.equal(
      getNowPlayingTransportAppearance('toggle-playback').iconColor,
      appTheme.colors.accentText,
    );
  });

  it('keeps queue navigation quieter than the rehearsal jumps', () => {
    assert.equal(
      getNowPlayingTransportAppearance('previous-item').iconColor,
      appTheme.colors.icon,
    );
    assert.equal(
      getNowPlayingTransportAppearance('next-item').iconColor,
      appTheme.colors.icon,
    );
    assert.equal(
      getNowPlayingTransportAppearance('seek-backward').iconColor,
      appTheme.colors.text,
    );
    assert.equal(
      getNowPlayingTransportAppearance('seek-forward').iconColor,
      appTheme.colors.text,
    );
  });

  it('gives every transport control at least a 44pt hit area', () => {
    for (const control of getNowPlayingTransportControls(true)) {
      assert.ok(getNowPlayingTransportAppearance(control).size >= 44, control);
    }
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
