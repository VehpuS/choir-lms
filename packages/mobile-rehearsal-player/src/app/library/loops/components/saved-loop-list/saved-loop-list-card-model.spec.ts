import assert from 'node:assert/strict';
import { describe, it } from 'node:test';

import { resolveSavedLoopCardPresentation } from './saved-loop-list-card-model';

const LOOP = { endMs: 108000, name: 'Bars 41–56', startMs: 72000 };

describe('resolveSavedLoopCardPresentation', () => {
  it('keeps an idle loop collapsed with its range, length, and a play ring', () => {
    const presentation = resolveSavedLoopCardPresentation({
      isActive: false,
      loop: LOOP,
      playbackActionLabel: 'Play',
    });

    assert.equal(presentation.tone, 'idle');
    assert.equal(presentation.footer, null);
    assert.equal(presentation.rangeLabel, '1:12–1:48');
    assert.equal(presentation.lengthLabel, '0:36');
    assert.equal(presentation.ringIconName, 'play');
    assert.equal(presentation.ringAccessibilityLabel, 'Play Bars 41–56');
  });

  it('expands the playing loop with a start / length / end footer and a pause ring', () => {
    const presentation = resolveSavedLoopCardPresentation({
      isActive: true,
      loop: LOOP,
      playbackActionLabel: 'Pause',
    });

    assert.equal(presentation.tone, 'active');
    assert.deepEqual(presentation.footer, {
      endLabel: '1:48',
      lengthLabel: '0:36',
      startLabel: '1:12',
    });
    assert.equal(presentation.ringIconName, 'pause');
  });

  it('stays expanded while the active loop is paused, offering resume', () => {
    const presentation = resolveSavedLoopCardPresentation({
      isActive: true,
      loop: LOOP,
      playbackActionLabel: 'Resume',
    });

    assert.equal(presentation.tone, 'active');
    assert.equal(presentation.ringIconName, 'play');
    assert.equal(presentation.ringAccessibilityLabel, 'Resume Bars 41–56');
  });
});
