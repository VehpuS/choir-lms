import assert from 'node:assert/strict';
import { describe, it } from 'node:test';

import {
  OWN_LAYOUT_NOTE,
  buildPdfLayoutSheetModel,
  routePdfLayoutChoice,
} from './pdf-layout-sheet-model.js';

const selectedLayouts = (model: ReturnType<typeof buildPdfLayoutSheetModel>) =>
  model.options.filter((option) => option.isSelected).map((o) => o.layout);

describe('buildPdfLayoutSheetModel', () => {
  it('offers Scroll, Pages, and Strip in that order', () => {
    const model = buildPdfLayoutSheetModel({
      deviceLayout: 'scroll',
      ownLayout: undefined,
    });

    assert.deepEqual(
      model.options.map((option) => option.label),
      ['Scroll', 'Pages', 'Strip'],
    );
  });

  it('marks the device layout when the file has none of its own', () => {
    const model = buildPdfLayoutSheetModel({
      deviceLayout: 'pages',
      ownLayout: undefined,
    });

    assert.deepEqual(selectedLayouts(model), ['pages']);
    assert.equal(model.ownLayoutNote, undefined);
    assert.equal(model.canUseDeviceLayout, false);
  });

  it("marks the file's own layout over the device layout and offers to clear it", () => {
    const model = buildPdfLayoutSheetModel({
      deviceLayout: 'pages',
      ownLayout: 'strip',
    });

    assert.deepEqual(selectedLayouts(model), ['strip']);
    assert.equal(model.ownLayoutNote, OWN_LAYOUT_NOTE);
    assert.equal(model.canUseDeviceLayout, true);
  });

  it('keeps the file’s own layout marked and explains a device change', () => {
    const model = buildPdfLayoutSheetModel({
      changedDeviceTo: 'pages',
      deviceLayout: 'pages',
      ownLayout: 'strip',
    });

    assert.deepEqual(selectedLayouts(model), ['strip']);
    assert.equal(
      model.deviceNote,
      'Device layout changed to Pages. This file keeps its own layout.',
    );
  });

  it('has no device note when the file follows the device layout', () => {
    const model = buildPdfLayoutSheetModel({
      changedDeviceTo: 'strip',
      deviceLayout: 'strip',
      ownLayout: undefined,
    });

    assert.equal(model.deviceNote, undefined);
    assert.deepEqual(selectedLayouts(model), ['strip']);
  });

  it('gives each layout its own glyph name', () => {
    const model = buildPdfLayoutSheetModel({
      deviceLayout: 'scroll',
      ownLayout: undefined,
    });

    assert.equal(new Set(model.options.map((o) => o.icon)).size, 3);
  });
});

describe('routePdfLayoutChoice', () => {
  it('saves as the device layout with the switch off, and on the file with it on', () => {
    assert.equal(routePdfLayoutChoice(false), 'device');
    assert.equal(routePdfLayoutChoice(true), 'file');
  });
});
