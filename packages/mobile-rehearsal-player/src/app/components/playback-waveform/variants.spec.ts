import assert from 'node:assert/strict';
import { describe, it } from 'node:test';

import { appTheme } from '../../utils/theme';
import { WAVEFORM_HEIGHT, getWaveformColors } from './variants';

const NOCTURNE_BAR_COLORS = {
  active: appTheme.colors.accent,
  inactive: appTheme.colors.divider,
  indicator: appTheme.colors.text,
};

describe('waveform variants', () => {
  it('draws the loop-card excerpt as a 28pt strip with played bars in accent', () => {
    assert.equal(WAVEFORM_HEIGHT.excerpt, 28);
    assert.deepEqual(
      getWaveformColors('excerpt', 'light'),
      NOCTURNE_BAR_COLORS,
    );
  });

  it('draws the now-playing scrubber at 56pt with accent played bars and a text playhead', () => {
    assert.equal(WAVEFORM_HEIGHT.scrubber, 56);
    assert.deepEqual(
      getWaveformColors('scrubber', 'light'),
      NOCTURNE_BAR_COLORS,
    );
  });
});
