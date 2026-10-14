import assert from 'node:assert/strict';
import { describe, it } from 'node:test';

import {
  MAX_SHEET_MUSIC_LABEL_LENGTH,
  MAX_SHEET_MUSIC_SOURCES,
  createSheetMusicSource,
  detectSheetMusicFormat,
  normalizeSheetMusicLabel,
  normalizeSheetMusicUrl,
  parseSourceSheetMusic,
} from './source-sheet-music.ts';

const ADDED_AT = '2026-01-01T00:00:00.000Z';

const buildStored = (id: string, overrides: Record<string, unknown> = {}) => ({
  id,
  label: `Score ${id}`,
  location: { kind: 'url', url: `https://example.com/${id}.pdf` },
  format: 'pdf',
  addedAt: ADDED_AT,
  ...overrides,
});

describe('detectSheetMusicFormat', () => {
  it('detects Drive files by extension even when the MIME type is generic', () => {
    const cases: Array<[string, string]> = [
      ['Alto part.pdf', 'pdf'],
      ['Score.MXL', 'musicxml'],
      ['Score.musicxml', 'musicxml'],
      ['Score.xml', 'musicxml'],
      ['Reduction.mid', 'midi'],
      ['Reduction.midi', 'midi'],
      ['Arrangement.mscz', 'musescore'],
      ['Arrangement.mscx', 'musescore'],
    ];

    for (const [name, expected] of cases) {
      assert.equal(
        detectSheetMusicFormat({ name, mimeType: 'application/octet-stream' }),
        expected,
        name,
      );
    }
  });

  it('falls back to the MIME type when the name has no extension', () => {
    assert.equal(
      detectSheetMusicFormat({ name: 'Score', mimeType: 'application/pdf' }),
      'pdf',
    );
    assert.equal(
      detectSheetMusicFormat({ name: 'Score', mimeType: 'audio/midi' }),
      'midi',
    );
    assert.equal(
      detectSheetMusicFormat({
        name: 'Score',
        mimeType: 'application/vnd.recordare.musicxml+xml',
      }),
      'musicxml',
    );
  });

  it('lets the extension win over an audio MIME type on a MIDI-like name', () => {
    assert.equal(
      detectSheetMusicFormat({ name: 'Score.pdf', mimeType: 'audio/mpeg' }),
      'pdf',
    );
  });

  it('detects a URL from its path extension, ignoring query and fragment', () => {
    assert.equal(
      detectSheetMusicFormat({ url: 'https://host.org/a/score.PDF?dl=1#p2' }),
      'pdf',
    );
    assert.equal(
      detectSheetMusicFormat({
        url: 'https://raw.githubusercontent.com/o/r/main/chorale.mxl',
      }),
      'musicxml',
    );
  });

  it('treats a musescore.com page as a link-out MuseScore source', () => {
    assert.equal(
      detectSheetMusicFormat({
        url: 'https://musescore.com/user/123/scores/456',
      }),
      'musescore',
    );
    assert.equal(
      detectSheetMusicFormat({ url: 'http://www.musescore.com/sheetmusic' }),
      'musescore',
    );
  });

  it('does not mistake a look-alike host for MuseScore', () => {
    assert.equal(
      detectSheetMusicFormat({ url: 'https://notmusescore.com/score' }),
      'link',
    );
  });

  it('keeps a URL with no clear extension as a plain link', () => {
    assert.equal(
      detectSheetMusicFormat({ url: 'https://choir.example/download?id=7' }),
      'link',
    );
  });

  it('refuses unsupported formats, unknown Drive files, and non-http URLs', () => {
    assert.equal(detectSheetMusicFormat({ name: 'Notes.docx' }), 'refused');
    assert.equal(
      detectSheetMusicFormat({ url: 'https://host.org/track.mp3' }),
      'refused',
    );
    assert.equal(
      detectSheetMusicFormat({ name: 'Mystery', mimeType: 'text/plain' }),
      'refused',
    );
    assert.equal(
      detectSheetMusicFormat({ url: 'ftp://host.org/score.pdf' }),
      'refused',
    );
    assert.equal(
      detectSheetMusicFormat({ url: 'javascript:alert(1)' }),
      'refused',
    );
  });
});

describe('normalizeSheetMusicUrl', () => {
  it('trims and accepts http and https only', () => {
    assert.equal(
      normalizeSheetMusicUrl('  https://a.org/x.pdf \n'),
      'https://a.org/x.pdf',
    );
    assert.equal(normalizeSheetMusicUrl('http://a.org'), 'http://a.org');
    assert.equal(normalizeSheetMusicUrl('file:///x.pdf'), undefined);
    assert.equal(normalizeSheetMusicUrl('https://'), undefined);
    assert.equal(normalizeSheetMusicUrl('https://a b.org'), undefined);
    assert.equal(normalizeSheetMusicUrl('not a url'), undefined);
  });
});

describe('normalizeSheetMusicLabel', () => {
  it('collapses whitespace and limits the length', () => {
    assert.equal(normalizeSheetMusicLabel('  Alto \n  part '), 'Alto part');
    assert.equal(
      normalizeSheetMusicLabel('x'.repeat(MAX_SHEET_MUSIC_LABEL_LENGTH + 20))
        ?.length,
      MAX_SHEET_MUSIC_LABEL_LENGTH,
    );
    assert.equal(normalizeSheetMusicLabel('   '), undefined);
  });
});

describe('createSheetMusicSource', () => {
  it('builds a normalized source', () => {
    assert.deepEqual(
      createSheetMusicSource({
        id: 's1',
        label: '  Full   score ',
        location: { kind: 'url', url: ' https://a.org/s.pdf ' },
        format: 'pdf',
        addedAt: ADDED_AT,
      }),
      {
        id: 's1',
        label: 'Full score',
        location: { kind: 'url', url: 'https://a.org/s.pdf' },
        format: 'pdf',
        addedAt: ADDED_AT,
      },
    );
  });

  it('refuses an empty label or an unusable location', () => {
    const base = { id: 's1', format: 'pdf', addedAt: ADDED_AT } as const;

    assert.equal(
      createSheetMusicSource({
        ...base,
        label: ' ',
        location: { kind: 'url', url: 'https://a.org/s.pdf' },
      }),
      undefined,
    );
    assert.equal(
      createSheetMusicSource({
        ...base,
        label: 'Score',
        location: { kind: 'url', url: 'ftp://a.org/s.pdf' },
      }),
      undefined,
    );
  });
});

describe('parseSourceSheetMusic', () => {
  it('reads a Drive source and a URL source with a part selection', () => {
    const drive = buildStored('a', {
      location: { kind: 'drive', fileId: 'f1', name: 'Alto.mxl' },
      format: 'musicxml',
      partSelection: { include: ['Alto'] },
    });

    assert.deepEqual(parseSourceSheetMusic([drive, buildStored('b')]), [
      {
        id: 'a',
        label: 'Score a',
        location: { kind: 'drive', fileId: 'f1', name: 'Alto.mxl' },
        format: 'musicxml',
        partSelection: { include: ['Alto'] },
        addedAt: ADDED_AT,
      },
      {
        id: 'b',
        label: 'Score b',
        location: { kind: 'url', url: 'https://example.com/b.pdf' },
        format: 'pdf',
        addedAt: ADDED_AT,
      },
    ]);
  });

  it('returns undefined when the value is not a non-empty list', () => {
    for (const value of [undefined, null, 'x', {}, 7, []]) {
      assert.equal(parseSourceSheetMusic(value), undefined);
    }
  });

  it('drops malformed entries without failing the read', () => {
    const parsed = parseSourceSheetMusic([
      null,
      'x',
      buildStored('', {}),
      buildStored('bad-format', { format: 'docx' }),
      buildStored('bad-location', {
        location: { kind: 'url', url: 'ftp://x' },
      }),
      buildStored('no-label', { label: '   ' }),
      buildStored('no-date', { addedAt: undefined }),
      buildStored('ok'),
    ]);

    assert.deepEqual(
      parsed?.map((source) => source.id),
      ['ok'],
    );
  });

  it('keeps the link when only the part selection is malformed', () => {
    const parsed = parseSourceSheetMusic([
      buildStored('a', { partSelection: { include: [] } }),
      buildStored('b', { partSelection: 'everyone' }),
      buildStored('c', { partSelection: { include: ['Bass', 3, ''] } }),
    ]);

    assert.deepEqual(
      parsed?.map((source) => source.partSelection),
      [undefined, undefined, { include: ['Bass'] }],
    );
  });

  it('keeps the first of any duplicate ids', () => {
    const parsed = parseSourceSheetMusic([
      buildStored('a', { label: 'First' }),
      buildStored('a', { label: 'Second' }),
    ]);

    assert.deepEqual(
      parsed?.map((source) => source.label),
      ['First'],
    );
  });

  it('caps the list at the source limit', () => {
    const stored = Array.from({ length: MAX_SHEET_MUSIC_SOURCES + 3 }, (_, i) =>
      buildStored(`s${i}`),
    );

    assert.equal(
      parseSourceSheetMusic(stored)?.length,
      MAX_SHEET_MUSIC_SOURCES,
    );
  });
});
