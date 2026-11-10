import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import path from 'node:path';
import { describe, it } from 'node:test';

import { isPasswordError, openPdf } from './pdfjs-loader';

// A real four-page soprano part. It guards the pdfjs-dist upgrade path: the
// loader must still import pdf.js and its worker and parse a real score.
const FIXTURE_PATH = path.resolve(
  __dirname,
  '../../../../test-support/fixtures/snow-soprano-four-pages.pdf',
);
const FIXTURE_PAGE_COUNT = 4;
const FIXTURE_TITLE_FRAGMENT = 'Snow';
const FIXTURE_PART_LABEL = 'Soprano';
const A4_WIDTH_PT = 595;
const A4_HEIGHT_PT = 842;

const loadFixtureBytes = () => new Uint8Array(readFileSync(FIXTURE_PATH));

type TextPage = {
  getTextContent(): Promise<{ items: ReadonlyArray<{ str?: string }> }>;
};

const firstPageText = async () => {
  const { doc, pages } = await openPdf(loadFixtureBytes());
  const page = pages[0].page as unknown as TextPage;
  const content = await page.getTextContent();
  await doc.destroy();

  return content.items.map((item) => item.str ?? '').join(' ');
};

describe('pdfjs-loader with a real score', () => {
  it('opens all four pages of the fixture', async () => {
    const { doc, pages } = await openPdf(loadFixtureBytes());
    await doc.destroy();

    assert.equal(pages.length, FIXTURE_PAGE_COUNT);
    assert.deepEqual(
      pages.map((entry) => entry.index),
      [0, 1, 2, 3],
    );
  });

  it('measures every page at an A4 size at scale 1', async () => {
    const { doc, pages } = await openPdf(loadFixtureBytes());
    await doc.destroy();

    for (const entry of pages) {
      assert.equal(Math.round(entry.width), A4_WIDTH_PT);
      assert.equal(Math.round(entry.height), A4_HEIGHT_PT);
    }
  });

  it('extracts the title and part label from the first page', async () => {
    const text = await firstPageText();

    assert.ok(text.includes(FIXTURE_TITLE_FRAGMENT));
    assert.ok(text.includes(FIXTURE_PART_LABEL));
  });

  it('does not treat an unencrypted score as password protected', async () => {
    await assert.doesNotReject(async () => {
      const { doc } = await openPdf(loadFixtureBytes());
      await doc.destroy();
    });
    assert.equal(isPasswordError(new Error('x')), false);
  });

  it('rejects bytes that are not a PDF', async () => {
    await assert.rejects(openPdf(new Uint8Array([1, 2, 3, 4])));
  });
});
