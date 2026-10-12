import assert from 'node:assert/strict';
import { describe, it } from 'node:test';

import { appTheme } from '../../../utils/theme.js';
import {
  MENU_ROW_MIN_HEIGHT,
  resolveMenuRowPalette,
  splitIntoMenuGroups,
} from './menu-group-model.js';

const { colors, fontWeight } = appTheme;

describe('menu group model', () => {
  it('starts a new rounded group at each section change', () => {
    assert.deepEqual(
      splitIntoMenuGroups(
        ['queue', 'next', 'tag', 'remove'],
        [false, false, true, true],
      ),
      [['queue', 'next'], ['tag'], ['remove']],
    );
  });

  it('keeps an unsectioned menu in one group and an empty menu empty', () => {
    assert.deepEqual(splitIntoMenuGroups(['a', 'b'], [false, false]), [
      ['a', 'b'],
    ]);
    assert.deepEqual(splitIntoMenuGroups([], []), []);
  });

  it('colors rows by tone without using the base accent for text', () => {
    assert.deepEqual(resolveMenuRowPalette('default'), {
      fontWeight: fontWeight.regular,
      icon: colors.textMuted,
      label: colors.text,
    });
    assert.deepEqual(resolveMenuRowPalette('preferred'), {
      fontWeight: fontWeight.medium,
      icon: colors.accentText,
      label: colors.accentText,
    });
    assert.deepEqual(resolveMenuRowPalette('destructive'), {
      fontWeight: fontWeight.regular,
      icon: colors.danger,
      label: colors.danger,
    });
    assert.deepEqual(resolveMenuRowPalette('cancel'), {
      fontWeight: fontWeight.medium,
      icon: colors.textMuted,
      label: colors.text,
    });
    assert.equal(resolveMenuRowPalette('accent').label, colors.accentText);
  });

  it('keeps menu rows above the 44pt minimum', () => {
    assert.ok(MENU_ROW_MIN_HEIGHT >= appTheme.space.touchTarget);
  });

  it('draws row icons in a color already verified against the sheet surface', () => {
    const verifiedTokens: string[] = [
      colors.textMuted,
      colors.accentText,
      colors.danger,
    ];

    for (const tone of [
      'accent',
      'cancel',
      'default',
      'destructive',
      'preferred',
    ] as const) {
      assert.ok(
        verifiedTokens.includes(resolveMenuRowPalette(tone).icon),
        tone,
      );
    }
  });
});
