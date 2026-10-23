import assert from 'node:assert/strict';
import { describe, it } from 'node:test';

import {
  parsePdfLayout,
  parseSourceSheetMusic,
  resolvePdfLayout,
} from './source-sheet-music.ts';

const buildStored = (id: string, overrides: Record<string, unknown> = {}) => ({
  id,
  label: `Score ${id}`,
  location: { kind: 'url', url: `https://example.com/${id}.pdf` },
  format: 'pdf',
  addedAt: '2026-01-01T00:00:00.000Z',
  ...overrides,
});

describe('pdfLayout on a source', () => {
  it('reads old data without the field as no override', () => {
    assert.equal(
      parseSourceSheetMusic([buildStored('a')])?.[0]?.pdfLayout,
      undefined,
    );
  });

  it('keeps a known layout', () => {
    const parsed = parseSourceSheetMusic([
      buildStored('a', { pdfLayout: 'pages' }),
      buildStored('b', { pdfLayout: 'strip' }),
      buildStored('c', { pdfLayout: 'scroll' }),
    ]);

    assert.deepEqual(
      parsed?.map((source) => source.pdfLayout),
      ['pages', 'strip', 'scroll'],
    );
  });

  it('drops an unknown layout but keeps the source', () => {
    const parsed = parseSourceSheetMusic([
      buildStored('a', { pdfLayout: 'carousel' }),
      buildStored('b', { pdfLayout: 3 }),
    ]);

    assert.equal(parsed?.length, 2);
    assert.equal('pdfLayout' in (parsed?.[0] ?? {}), false);
    assert.equal('pdfLayout' in (parsed?.[1] ?? {}), false);
  });

  it('accepts only the three layouts', () => {
    assert.equal(parsePdfLayout('strip'), 'strip');
    assert.equal(parsePdfLayout('Strip'), undefined);
    assert.equal(parsePdfLayout(undefined), undefined);
  });
});

describe('resolvePdfLayout', () => {
  it("prefers the source's own layout over the device layout", () => {
    assert.equal(resolvePdfLayout({ pdfLayout: 'strip' }, 'pages'), 'strip');
  });

  it('uses the device layout when the source has none', () => {
    assert.equal(resolvePdfLayout({}, 'pages'), 'pages');
    assert.equal(resolvePdfLayout(undefined, 'strip'), 'strip');
  });

  it('falls back to scroll', () => {
    assert.equal(resolvePdfLayout({}, undefined), 'scroll');
    assert.equal(resolvePdfLayout(undefined, undefined), 'scroll');
  });
});
