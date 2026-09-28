import assert from 'node:assert/strict';
import { describe, it } from 'node:test';

import { resolveAppIconGlyph } from '../../components/app-icon/model.js';
import { appTheme } from '../../utils/theme.js';
import { SHELL_DESTINATIONS } from './shell-model.js';
import { getShellTabPresentation } from './shell-tab-bar-model.js';

const DESTINATION_KEYS = SHELL_DESTINATIONS.map((destination) => {
  return destination.key;
});

describe('shell tab bar model', () => {
  it('marks the active tab with the accent mark, accent color, and a filled glyph', () => {
    for (const destination of DESTINATION_KEYS) {
      const presentation = getShellTabPresentation(destination, true);

      assert.equal(presentation.showActiveMark, true);
      assert.equal(presentation.color, appTheme.colors.accentText);
      assert.equal(resolveAppIconGlyph(presentation.iconName).weight, 'fill');
    }
  });

  it('renders inactive tabs with the same glyph at regular weight in the muted color', () => {
    for (const destination of DESTINATION_KEYS) {
      const active = getShellTabPresentation(destination, true);
      const inactive = getShellTabPresentation(destination, false);

      assert.equal(inactive.showActiveMark, false);
      assert.equal(inactive.color, appTheme.colors.textMuted);
      assert.equal(resolveAppIconGlyph(inactive.iconName).weight, 'regular');
      assert.equal(
        resolveAppIconGlyph(inactive.iconName).glyph,
        resolveAppIconGlyph(active.iconName).glyph,
      );
    }
  });

  it('gives every destination its own glyph', () => {
    const glyphs = DESTINATION_KEYS.map((destination) => {
      return resolveAppIconGlyph(
        getShellTabPresentation(destination, false).iconName,
      ).glyph;
    });

    assert.equal(new Set(glyphs).size, DESTINATION_KEYS.length);
  });
});
