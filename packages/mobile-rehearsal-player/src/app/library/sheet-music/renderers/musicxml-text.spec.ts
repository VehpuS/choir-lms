import assert from 'node:assert/strict';
import { describe, it } from 'node:test';

import JSZip from 'jszip';

import { readMusicXmlText } from './musicxml-text.js';

const SCORE =
  '<?xml version="1.0"?><score-partwise><part-list/></score-partwise>';
const CONTAINER = (path: string) =>
  `<?xml version="1.0"?><container><rootfiles><rootfile full-path="${path}" media-type="application/vnd.recordare.musicxml+xml"/></rootfiles></container>`;

const zip = async (files: Record<string, string>) => {
  const archive = new JSZip();

  for (const [name, content] of Object.entries(files)) {
    archive.file(name, content);
  }

  return archive.generateAsync({ type: 'uint8array' });
};

describe('readMusicXmlText', () => {
  it('decodes a plain score as UTF-8', async () => {
    const text =
      '<score-partwise><part-list/><!-- Kyrie – Ælfred --></score-partwise>';

    assert.equal(
      await readMusicXmlText(new TextEncoder().encode(text), false),
      text,
    );
  });

  it('decodes UTF-16 and UTF-8 with a byte-order mark', async () => {
    const utf16 = Uint8Array.from([
      0xff,
      0xfe,
      ...[...SCORE].flatMap((c) => [c.charCodeAt(0), 0]),
    ]);
    const utf8Bom = Uint8Array.from([
      0xef,
      0xbb,
      0xbf,
      ...new TextEncoder().encode(SCORE),
    ]);

    assert.equal(await readMusicXmlText(utf16, false), SCORE);
    assert.equal(await readMusicXmlText(utf8Bom, false), SCORE);
  });

  it('reads the root file a compressed score names in its container', async () => {
    const bytes = await zip({
      'META-INF/container.xml': CONTAINER('score/main.xml'),
      'score/main.xml': SCORE,
      'other.xml': '<not-a-score/>',
    });

    assert.equal(await readMusicXmlText(bytes, true), SCORE);
  });

  it('falls back to the first XML file when there is no container', async () => {
    const bytes = await zip({
      'META-INF/other.txt': 'x',
      'song.musicxml': SCORE,
    });

    assert.equal(await readMusicXmlText(bytes, true), SCORE);
  });

  it('refuses text and archives that are not a score, without throwing', async () => {
    const notScore = await zip({ 'a.xml': '<rss version="2.0"/>' });

    assert.equal(
      await readMusicXmlText(new TextEncoder().encode('<html/>'), false),
      null,
    );
    assert.equal(await readMusicXmlText(notScore, true), null);
    assert.equal(await readMusicXmlText(await zip({}), true), null);
    assert.equal(
      await readMusicXmlText(new TextEncoder().encode('not a zip'), true),
      null,
    );
  });
});
