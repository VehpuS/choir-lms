import assert from 'node:assert/strict';
import { describe, it } from 'node:test';

import {
  MAX_PDF_ZOOM,
  MIN_PDF_ZOOM,
  clampPdfZoom,
  computePdfPageLayout,
} from './pdf-page-layout.js';

const LETTER = { pageHeight: 792, pageWidth: 612 };

describe('computePdfPageLayout', () => {
  it('fits the page to the container width at zoom 1', () => {
    const layout = computePdfPageLayout({
      ...LETTER,
      containerWidth: 306,
      devicePixelRatio: 1,
      zoom: 1,
    });

    assert.equal(layout.cssWidth, 306);
    assert.equal(layout.cssHeight, 396);
    assert.equal(layout.renderScale, 0.5);
  });

  it('scales the column with zoom and keeps the aspect ratio', () => {
    const layout = computePdfPageLayout({
      ...LETTER,
      containerWidth: 306,
      devicePixelRatio: 1,
      zoom: 2,
    });

    assert.deepEqual(
      [layout.cssWidth, layout.cssHeight, layout.renderScale],
      [612, 792, 1],
    );
  });

  it('draws at the screen pixel ratio, up to 2x', () => {
    const at = (devicePixelRatio: number) =>
      computePdfPageLayout({
        ...LETTER,
        containerWidth: 612,
        devicePixelRatio,
        zoom: 1,
      }).renderScale;

    assert.equal(at(1), 1);
    assert.equal(at(2), 2);
    assert.equal(at(3), 2);
    assert.equal(at(0), 1);
  });

  it('draws at lower resolution rather than exceed the canvas cap', () => {
    const layout = computePdfPageLayout({
      ...LETTER,
      containerWidth: 1200,
      devicePixelRatio: 2,
      zoom: 4,
    });
    const pixels =
      layout.cssWidth *
      layout.cssHeight *
      (layout.renderScale / (layout.cssWidth / LETTER.pageWidth)) ** 2;

    assert.ok(pixels <= 12_000_001, `canvas of ${pixels} pixels`);
    assert.ok(layout.renderScale > 0);
  });

  it('survives an unmeasured container', () => {
    const layout = computePdfPageLayout({
      ...LETTER,
      containerWidth: 0,
      devicePixelRatio: 1,
      zoom: 1,
    });

    assert.ok(Number.isFinite(layout.cssHeight) && layout.cssHeight > 0);
  });
});

describe('clampPdfZoom', () => {
  it('keeps zoom within the supported range', () => {
    assert.equal(clampPdfZoom(0.1), MIN_PDF_ZOOM);
    assert.equal(clampPdfZoom(99), MAX_PDF_ZOOM);
    assert.equal(clampPdfZoom(1.5), 1.5);
  });
});
