/// <reference types="node" />

import assert from 'node:assert/strict';
import { describe, it } from 'node:test';

import { resolveRepeatToggleModel } from '../../routing/playback/playback-session-mode-options.js';
import {
  APP_ICON_GLYPHS,
  resolveAppIconGlyph,
  resolveSkipSecondsLabelSize,
  type AppIconName,
} from './model.js';

const REPEAT_MODES = ['off', 'one', 'all'] as const;

const namesUsingGlyph = (glyph: string) => {
  return (Object.keys(APP_ICON_GLYPHS) as AppIconName[]).filter((name) => {
    return APP_ICON_GLYPHS[name].glyph === glyph;
  });
};

describe('app icon glyph map', () => {
  it('renders every repeat state with a repeat-family glyph and never the shuffle glyph', () => {
    const shuffleGlyph = resolveAppIconGlyph('shuffle').glyph;

    for (const mode of REPEAT_MODES) {
      const { icon } = resolveRepeatToggleModel(mode, [...REPEAT_MODES]);
      const { glyph } = resolveAppIconGlyph(icon);

      assert.match(glyph, /^Repeat/);
      assert.notEqual(glyph, shuffleGlyph);
    }
  });

  it('reserves the crossing-arrows shuffle glyph for shuffle alone', () => {
    assert.deepEqual(namesUsingGlyph('Shuffle'), ['shuffle']);
  });

  it('gives repeat-one its own glyph distinct from plain repeat', () => {
    assert.notEqual(
      resolveAppIconGlyph('repeat-once').glyph,
      resolveAppIconGlyph('repeat').glyph,
    );
  });

  it('keeps the drag handle distinct from playback, More Options, and removal glyphs', () => {
    const dragGlyph = resolveAppIconGlyph('drag-vertical').glyph;
    const otherRowGlyphs: AppIconName[] = [
      'play',
      'pause',
      'dots-vertical',
      'close',
      'close-circle-outline',
    ];

    for (const name of otherRowGlyphs) {
      assert.notEqual(resolveAppIconGlyph(name).glyph, dragGlyph, name);
    }

    assert.deepEqual(namesUsingGlyph(dragGlyph), ['drag-vertical']);
  });

  it('keeps rehearsal skip controls distinct from queue navigation', () => {
    const queueGlyphs = [
      resolveAppIconGlyph('skip-previous').glyph,
      resolveAppIconGlyph('skip-next').glyph,
    ];

    for (const name of ['rewind-15', 'fast-forward-15'] as const) {
      const skip = resolveAppIconGlyph(name);

      assert.equal(skip.skipSeconds, 15);
      assert.ok(!queueGlyphs.includes(skip.glyph), name);
    }
  });

  it('uses the filled weight for play and pause transport glyphs', () => {
    assert.equal(resolveAppIconGlyph('play').weight, 'fill');
    assert.equal(resolveAppIconGlyph('pause').weight, 'fill');
  });

  it('marks Drive selection with a regular circle and a filled check-circle', () => {
    assert.deepEqual(resolveAppIconGlyph('circle-outline'), {
      glyph: 'Circle',
      weight: 'regular',
    });
    assert.deepEqual(resolveAppIconGlyph('check-circle'), {
      glyph: 'CheckCircle',
      weight: 'fill',
    });
  });

  it('sizes the skip numeral to fit inside the arrow glyph', () => {
    assert.equal(resolveSkipSecondsLabelSize(28), 10);
    assert.ok(resolveSkipSecondsLabelSize(22) < 22 / 2);
  });
});
