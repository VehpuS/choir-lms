import assert from 'node:assert/strict';
import { describe, it } from 'node:test';

import type { PdfLayout } from '@org/audio-library-models';

import { syncPdfLayout } from './sync-pdf-layout.js';

// A fake renderer that, like the real one, returns to zoom 1 on a layout change.
const fakePdf = (layout: PdfLayout, zoom: number) => {
  const state = { layout, zoom };

  return {
    currentLayout: () => state.layout,
    currentZoom: () => state.zoom,
    setLayout: (next: PdfLayout) => {
      state.layout = next;
      state.zoom = 1;
    },
  };
};

describe('syncPdfLayout', () => {
  it('changes the layout and reports the fitted zoom', () => {
    const zooms: number[] = [];
    const pdf = fakePdf('scroll', 1.5);

    syncPdfLayout(pdf, 'pages', (zoom) => zooms.push(zoom));

    assert.equal(pdf.currentLayout(), 'pages');
    assert.deepEqual(zooms, [1]);
  });

  it('leaves a PDF already in the layout, and its zoom, alone', () => {
    const zooms: number[] = [];
    const pdf = fakePdf('pages', 1.5);

    syncPdfLayout(pdf, 'pages', (zoom) => zooms.push(zoom));

    assert.equal(pdf.currentZoom(), 1.5);
    assert.deepEqual(zooms, []);
  });

  it('does nothing before a PDF is drawn', () => {
    assert.doesNotThrow(() => syncPdfLayout(undefined, 'pages', () => 0));
  });
});
