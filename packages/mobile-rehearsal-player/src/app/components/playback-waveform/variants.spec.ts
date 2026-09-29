import assert from 'node:assert/strict';
import { describe, it } from 'node:test';

import { appTheme } from '../../utils/theme';
import { WAVEFORM_HEIGHT, getWaveformColors } from './variants';

describe('waveform variants', () => {
  it('draws the loop-card excerpt as a 28pt strip with played bars in accent', () => {
    assert.equal(WAVEFORM_HEIGHT.excerpt, 28);
    assert.deepEqual(getWaveformColors('excerpt', 'light'), {
      active: appTheme.colors.accent,
      inactive: appTheme.colors.divider,
      indicator: appTheme.colors.text,
    });
  });
});
