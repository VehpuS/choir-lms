import assert from 'node:assert/strict';
import { describe, it } from 'node:test';

import type { MiniPlayerSummary } from '../shell-model.js';
import { getPianoPlayingChip } from './piano-playing-chip-model.js';

const summary = { title: 'Ubi caritas' } as MiniPlayerSummary;
const noop = () => undefined;

describe('getPianoPlayingChip', () => {
  it('is absent while nothing plays', () => {
    assert.equal(
      getPianoPlayingChip({
        miniPlayerSummary: null,
        onTogglePlayback: noop,
        playbackState: undefined,
        playbackToggleLabel: 'Play',
      }),
      null,
    );
  });

  it('shows the title and a pause control while playing', () => {
    const chip = getPianoPlayingChip({
      miniPlayerSummary: summary,
      onTogglePlayback: noop,
      playbackState: 'playing',
      playbackToggleLabel: 'Pause Ubi caritas',
    });

    assert.equal(chip?.title, 'Ubi caritas');
    assert.equal(chip?.isPlaying, true);
    assert.equal(chip?.toggleLabel, 'Pause Ubi caritas');
  });

  it('shows a play control once paused', () => {
    const chip = getPianoPlayingChip({
      miniPlayerSummary: summary,
      onTogglePlayback: noop,
      playbackState: 'paused',
      playbackToggleLabel: 'Play Ubi caritas',
    });

    assert.equal(chip?.isPlaying, false);
  });
});
