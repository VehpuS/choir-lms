import assert from 'node:assert/strict';
import { describe, it } from 'node:test';

import { getPlaybackMarqueeDistancePx } from './playback-marquee-model';

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
