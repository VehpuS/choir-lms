import assert from 'node:assert/strict';
import { describe, it } from 'node:test';

import {
  getPlaybackMarqueeDistancePx,
  shouldAnimatePlaybackMarquee,
} from './playback-marquee-model';

const LONG_TITLE = 'A title longer than twenty-four characters';

describe('playback marquee animation', () => {
  it('scrolls a long title while playing', () => {
    assert.equal(
      shouldAnimatePlaybackMarquee({ enabled: true, text: LONG_TITLE }),
      true,
    );
  });

  it('does not scroll a short title or when not playing', () => {
    assert.equal(
      shouldAnimatePlaybackMarquee({ enabled: true, text: 'Kyrie' }),
      false,
    );
    assert.equal(
      shouldAnimatePlaybackMarquee({ enabled: false, text: LONG_TITLE }),
      false,
    );
  });

  it('never scrolls under Reduce Motion', () => {
    assert.equal(
      shouldAnimatePlaybackMarquee({
        enabled: true,
        reduceMotion: true,
        text: LONG_TITLE,
      }),
      false,
    );
  });
});

describe('playback marquee distance', () => {
  it('scrolls one full measured title width before repeating', () => {
    assert.equal(
      getPlaybackMarqueeDistancePx({
        measuredTextWidth: 470,
        text: "Loop 0:56 - 1:33 • Camille O'Sullivan - Don't think twice.mp3",
      }),
      498,
    );
  });

  it('uses the character estimate until the title is measured', () => {
    assert.equal(
      getPlaybackMarqueeDistancePx({
        measuredTextWidth: 0,
        text: 'A title longer than twenty-four characters',
      }),
      172,
    );
  });
});
