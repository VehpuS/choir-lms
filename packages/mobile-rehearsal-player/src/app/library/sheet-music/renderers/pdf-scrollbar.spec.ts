import assert from 'node:assert/strict';
import { describe, it } from 'node:test';

import { applyPdfScrollbar, isPdfScrollbarHidden } from './pdf-scrollbar.js';
import type { HostElement } from './pdf-web-types.js';

// A lightweight fake of the slice of the DOM the module touches: attributes on
// the host and a head that collects appended style elements.
const createFakeHost = () => {
  const attributes = new Map<string, string>();
  const styles: { id: string; textContent: string | null }[] = [];
  const host = {
    ownerDocument: {
      createElement: () => ({ id: '', textContent: null }),
      getElementById: (id: string) => styles.find((style) => style.id === id),
      head: { appendChild: (style: never) => styles.push(style) },
    },
    removeAttribute: (name: string) => attributes.delete(name),
    setAttribute: (name: string, value: string) => attributes.set(name, value),
  } as unknown as HostElement;

  return { attributes, host, styles };
};

describe('isPdfScrollbarHidden', () => {
  it('hides the sideways scrollbar in pages and keeps it in strip and scroll', () => {
    assert.equal(isPdfScrollbarHidden('pages'), true);
    assert.equal(isPdfScrollbarHidden('strip'), false);
    assert.equal(isPdfScrollbarHidden('scroll'), false);
  });
});

describe('applyPdfScrollbar', () => {
  it('marks the host hidden in pages and restores it when the layout changes to strip', () => {
    const { attributes, host } = createFakeHost();

    applyPdfScrollbar(host, 'pages');
    assert.equal(attributes.get('data-pdf-scrollbar'), 'hidden');

    applyPdfScrollbar(host, 'strip');
    assert.equal(attributes.has('data-pdf-scrollbar'), false);
  });

  it('adds the hiding stylesheet once, covering the WebKit scrollbar', () => {
    const { host, styles } = createFakeHost();

    applyPdfScrollbar(host, 'pages');
    applyPdfScrollbar(host, 'pages');

    assert.equal(styles.length, 1);
    assert.match(styles[0].textContent ?? '', /::-webkit-scrollbar/);
    assert.match(styles[0].textContent ?? '', /scrollbar-width:none/);
  });

  it('clears the mark when the renderer lets go of the host', () => {
    const { attributes, host } = createFakeHost();

    applyPdfScrollbar(host, 'pages');
    applyPdfScrollbar(host, undefined);

    assert.equal(attributes.has('data-pdf-scrollbar'), false);
  });
});
