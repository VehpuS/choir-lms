import assert from 'node:assert/strict';
import { describe, it } from 'node:test';

import { PDF_PAGE_GAP_PX } from './pdf-layout-model.js';
import {
  pdfColumnStyle,
  pdfObserverMargin,
  pdfPageStyle,
} from './pdf-layout-style.js';

const BOX = { height: 400, left: 0, top: 0, width: 300 };

describe('pdfObserverMargin', () => {
  it('looks ahead vertically in scroll and sideways in strip', () => {
    assert.equal(pdfObserverMargin('scroll'), '150% 0px');
    assert.equal(pdfObserverMargin('strip'), '0px 150%');
  });
});

describe('pdfColumnStyle', () => {
  it('stacks pages in scroll and lines them up in strip', () => {
    assert.match(pdfColumnStyle('scroll'), /flex-direction:column/);
    assert.match(pdfColumnStyle('strip'), /flex-direction:row/);
  });

  it('starts a strip at the top so a zoomed page can be scrolled to', () => {
    assert.match(pdfColumnStyle('strip'), /align-items:flex-start/);
  });
});

describe('pdfPageStyle', () => {
  it('sizes the page and puts the gap below it in scroll', () => {
    const style = pdfPageStyle('scroll', BOX);

    assert.match(style, /width:300px;height:400px;/);
    assert.match(style, new RegExp(`margin:0 0 ${PDF_PAGE_GAP_PX}px;`));
  });

  it('puts the gap after the page in strip', () => {
    assert.match(
      pdfPageStyle('strip', BOX),
      new RegExp(`margin:0 ${PDF_PAGE_GAP_PX}px 0 0;`),
    );
  });

  it('keeps pages white and from shrinking', () => {
    assert.match(pdfPageStyle('strip', BOX), /background:#fff;flex:none;/);
  });
});
