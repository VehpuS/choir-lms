import assert from 'node:assert/strict';
import { describe, it } from 'node:test';

import { computeThumbnailScale } from './pdf-page-layout.js';
import { drawPdfThumbnail } from './pdf-thumbnail.js';
import type { DomCanvas, PdfPage } from './pdf-web-types.js';

const fakeCanvas = (): DomCanvas => ({
  appendChild: () => undefined,
  getContext: () => ({}),
  height: 0,
  innerHTML: '',
  style: { cssText: '' },
  width: 0,
});

const fakePage = (rejects = false) => {
  const state = { cancelled: false };
  const page: PdfPage = {
    getViewport: ({ scale }) => ({ height: 800 * scale, width: 600 * scale }),
    render: () => ({
      cancel: () => {
        state.cancelled = true;
      },
      promise: rejects
        ? Promise.reject(new Error('cancelled'))
        : Promise.resolve(),
    }),
  };

  return { page, state };
};

describe('computeThumbnailScale', () => {
  it('scales the page to the thumbnail width at the pixel ratio', () => {
    assert.equal(
      computeThumbnailScale({
        cssWidth: 120,
        devicePixelRatio: 2,
        pageWidth: 600,
      }),
      0.4,
    );
    assert.equal(
      computeThumbnailScale({
        cssWidth: 120,
        devicePixelRatio: 1,
        pageWidth: 600,
      }),
      0.2,
    );
  });

  it('caps the pixel ratio at 2 and floors it at 1', () => {
    assert.equal(
      computeThumbnailScale({
        cssWidth: 120,
        devicePixelRatio: 3,
        pageWidth: 600,
      }),
      0.4,
    );
    assert.equal(
      computeThumbnailScale({
        cssWidth: 120,
        devicePixelRatio: 0.5,
        pageWidth: 600,
      }),
      0.2,
    );
  });
});

describe('drawPdfThumbnail', () => {
  it('sizes the canvas to the page at the thumbnail scale', async () => {
    const canvas = fakeCanvas();
    const { page } = fakePage();
    const task = drawPdfThumbnail({
      canvas,
      cssWidth: 120,
      devicePixelRatio: 2,
      page,
    });

    assert.equal(canvas.width, 240);
    assert.equal(canvas.height, 320);
    assert.equal(await task.done, true);
  });

  it('settles false and leaves the canvas alone when there is no page', async () => {
    const canvas = fakeCanvas();
    const task = drawPdfThumbnail({
      canvas,
      cssWidth: 120,
      devicePixelRatio: 1,
      page: undefined,
    });

    task.cancel();

    assert.equal(canvas.width, 0);
    assert.equal(await task.done, false);
  });

  it('settles false when the render is cancelled', async () => {
    const { page, state } = fakePage(true);
    const task = drawPdfThumbnail({
      canvas: fakeCanvas(),
      cssWidth: 120,
      devicePixelRatio: 1,
      page,
    });

    task.cancel();

    assert.equal(state.cancelled, true);
    assert.equal(await task.done, false);
  });
});
