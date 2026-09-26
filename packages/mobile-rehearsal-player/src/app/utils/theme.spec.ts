import assert from 'node:assert/strict';
import { describe, it } from 'node:test';

import { appTheme } from './theme';

const HEX_COLOR_PATTERN = /^#([0-9a-f]{2})([0-9a-f]{2})([0-9a-f]{2})$/i;
const BODY_TEXT_MIN_CONTRAST = 4.5;
const LARGE_TEXT_MIN_CONTRAST = 3;

function toRelativeLuminance(hexColor: string): number {
  const match = HEX_COLOR_PATTERN.exec(hexColor);
  assert.ok(match, `expected a #rrggbb color, received ${hexColor}`);

  const [red, green, blue] = match.slice(1).map((channel) => {
    const value = Number.parseInt(channel, 16) / 255;
    return value <= 0.03928 ? value / 12.92 : ((value + 0.055) / 1.055) ** 2.4;
  });

  return 0.2126 * red + 0.7152 * green + 0.0722 * blue;
}

function getContrastRatio(foreground: string, background: string): number {
  const [lighter, darker] = [
    toRelativeLuminance(foreground),
    toRelativeLuminance(background),
  ].sort((left, right) => {
    return right - left;
  });

  return (lighter + 0.05) / (darker + 0.05);
}

const RGBA_COLOR_PATTERN = /^rgba\((\d+),\s*(\d+),\s*(\d+),\s*([\d.]+)\)$/;

function toHexChannel(value: number): string {
  return Math.round(value).toString(16).padStart(2, '0');
}

/** Flattens an `rgba(...)` tint over an opaque `#rrggbb` ground. */
function compositeOver(tint: string, ground: string): string {
  const tintMatch = RGBA_COLOR_PATTERN.exec(tint);
  const groundMatch = HEX_COLOR_PATTERN.exec(ground);
  assert.ok(tintMatch && groundMatch, `cannot composite ${tint} on ${ground}`);

  const alpha = Number(tintMatch[4]);
  const channels = [1, 2, 3].map((index) => {
    const tintChannel = Number(tintMatch[index]);
    const groundChannel = Number.parseInt(groundMatch[index], 16);
    return toHexChannel(tintChannel * alpha + groundChannel * (1 - alpha));
  });

  return `#${channels.join('')}`;
}

const { colors } = appTheme;
const BODY_TEXT_TOKENS = {
  accentOnTint: colors.accentOnTint,
  accentText: colors.accentText,
  danger: colors.danger,
  success: colors.success,
  text: colors.text,
  textMuted: colors.textMuted,
  textSecondary: colors.textSecondary,
  warning: colors.warning,
} as const;
const STATUS_TINTS = {
  danger: [colors.danger, colors.dangerFill],
  success: [colors.success, colors.successFill],
  warning: [colors.warning, colors.warningFill],
} as const;
const GROUNDS = {
  bg: colors.bg,
  surface: colors.surface,
  surfaceRaised: colors.surfaceRaised,
} as const;

describe('Nocturne theme tokens', () => {
  for (const [textName, textColor] of Object.entries(BODY_TEXT_TOKENS)) {
    for (const [groundName, groundColor] of Object.entries(GROUNDS)) {
      it(`keeps ${textName} at body-text contrast on ${groundName}`, () => {
        assert.ok(
          getContrastRatio(textColor, groundColor) >= BODY_TEXT_MIN_CONTRAST,
        );
      });
    }
  }

  it('keeps accent-on-tint chip text at body-text contrast on its tinted chip', () => {
    assert.ok(
      getContrastRatio(colors.accentOnTint, colors.surfaceAccent) >=
        BODY_TEXT_MIN_CONTRAST,
    );
  });

  for (const [statusName, [textColor, fillColor]] of Object.entries(
    STATUS_TINTS,
  )) {
    it(`keeps ${statusName} text at body-text contrast on its tint over the surface`, () => {
      const tintedSurface = compositeOver(fillColor, colors.surface);

      assert.ok(
        getContrastRatio(textColor, tintedSurface) >= BODY_TEXT_MIN_CONTRAST,
      );
    });
  }

  it('keeps the base accent at least at the large-text threshold on the ground', () => {
    assert.ok(
      getContrastRatio(colors.accent, colors.bg) >= LARGE_TEXT_MIN_CONTRAST,
    );
  });

  it('uses accent-300 as the body-size accent text step', () => {
    assert.equal(colors.accentText, colors.accentRamp[300]);
  });

  it('maps legacy color keys onto Nocturne tokens', () => {
    assert.equal(colors.pageBackground, colors.bg);
    assert.equal(colors.primaryText, colors.text);
    assert.equal(colors.listMarker, colors.accent);
  });

  it('derives the spacing scale from a 4pt base at 0.70x', () => {
    assert.deepEqual(
      [
        appTheme.space.xxs,
        appTheme.space.xs,
        appTheme.space.sm,
        appTheme.space.md,
      ],
      [3, 6, 8, 11],
    );
  });

  it('keeps the minimum touch target at 44pt', () => {
    assert.equal(appTheme.space.touchTarget, 44);
  });
});
