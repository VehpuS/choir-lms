import assert from 'node:assert/strict';
import { describe, it } from 'node:test';

import {
  MAX_SHEET_MUSIC_SOURCES,
  type SheetMusicSource,
} from '@org/audio-library-models';

import {
  INVALID_LINK_MESSAGE,
  MUSESCORE_EXPORT_HINT,
  SUPPORTED_FORMATS_MESSAGE,
  describeSheetMusicRow,
  findDuplicateSheetMusic,
  hasReachedSheetMusicLimit,
  resolveLinkAddition,
  suggestLabelFromFileName,
  suggestLabelFromUrl,
} from './model';

const source = (
  overrides: Partial<SheetMusicSource> & Pick<SheetMusicSource, 'format'>,
): SheetMusicSource => ({
  addedAt: '2026-10-15T00:00:00.000Z',
  id: 'sheet-music:1',
  label: 'Full score',
  location: { kind: 'url', url: 'https://example.org/score' },
  ...overrides,
});

describe('describeSheetMusicRow', () => {
  it('offers View for the formats the viewer shows', () => {
    for (const [format, detail] of [
      ['pdf', 'PDF'],
      ['musicxml', 'MusicXML'],
      ['midi', 'MIDI'],
    ] as const) {
      assert.deepEqual(describeSheetMusicRow(source({ format })), {
        actionLabel: 'View',
        canView: true,
        detail,
      });
    }
  });

  it('opens a link in the browser and says it opens outside the app', () => {
    assert.deepEqual(
      describeSheetMusicRow(
        source({
          format: 'musescore',
          location: {
            kind: 'url',
            url: 'https://musescore.com/user/1/scores/2',
          },
        }),
      ),
      {
        actionLabel: 'Open in browser',
        canView: false,
        detail: 'MuseScore · Opens outside the app',
      },
    );
  });

  it('opens a Drive MuseScore file in Drive and hints at exporting MusicXML', () => {
    assert.deepEqual(
      describeSheetMusicRow(
        source({
          format: 'musescore',
          location: { fileId: 'f1', kind: 'drive', name: 'Kyrie.mscz' },
        }),
      ),
      {
        actionLabel: 'Open in Drive',
        canView: false,
        detail: 'MuseScore · Opens outside the app',
        hint: MUSESCORE_EXPORT_HINT,
      },
    );
  });

  it('hints for a .mscz link even with a query string', () => {
    const row = describeSheetMusicRow(
      source({
        format: 'musescore',
        location: { kind: 'url', url: 'https://example.org/k.mscz?dl=1' },
      }),
    );

    assert.equal(row.hint, MUSESCORE_EXPORT_HINT);
  });

  it('treats a link with no clear file type as outside the app', () => {
    const row = describeSheetMusicRow(source({ format: 'link' }));

    assert.equal(row.canView, false);
    assert.equal(row.detail, 'Link · Opens outside the app');
  });
});

describe('hasReachedSheetMusicLimit', () => {
  it('turns on at the per-track limit', () => {
    assert.equal(hasReachedSheetMusicLimit(MAX_SHEET_MUSIC_SOURCES - 1), false);
    assert.equal(hasReachedSheetMusicLimit(MAX_SHEET_MUSIC_SOURCES), true);
  });
});

describe('suggestLabelFromUrl', () => {
  it('uses the file name without its extension', () => {
    assert.equal(
      suggestLabelFromUrl('https://example.org/scores/kyrie-alto.pdf?x=1'),
      'kyrie-alto',
    );
    assert.equal(
      suggestLabelFromUrl('https://example.org/a/Ave%20Maria_SATB.mxl'),
      'Ave Maria SATB',
    );
  });

  it('falls back to the host when the link has no path', () => {
    assert.equal(suggestLabelFromUrl('https://example.org/'), 'example.org');
  });
});

describe('findDuplicateSheetMusic', () => {
  const driveSource = source({
    format: 'pdf',
    id: 'sheet-music:drive',
    label: 'Alto part',
    location: { fileId: 'file-1', kind: 'drive', name: 'alto.pdf' },
  });
  const linkSource = source({ format: 'pdf', id: 'sheet-music:link' });

  it('finds a Drive file already on the track, whatever its name or label', () => {
    assert.equal(
      findDuplicateSheetMusic([linkSource, driveSource], {
        fileId: 'file-1',
        kind: 'drive',
        name: 'renamed-in-drive.pdf',
      }),
      driveSource,
    );
  });

  it('finds a link already on the track', () => {
    assert.equal(
      findDuplicateSheetMusic([driveSource, linkSource], {
        kind: 'url',
        url: 'https://example.org/score',
      }),
      linkSource,
    );
  });

  it('treats a different file or link as new, and a Drive id never matches a link', () => {
    assert.equal(
      findDuplicateSheetMusic([driveSource, linkSource], {
        fileId: 'file-2',
        kind: 'drive',
        name: 'alto.pdf',
      }),
      undefined,
    );
    assert.equal(
      findDuplicateSheetMusic([driveSource], {
        kind: 'url',
        url: 'file-1',
      }),
      undefined,
    );
  });
});

describe('resolveLinkAddition', () => {
  it('refuses a link the track already has and names the existing source', () => {
    const existing = source({ format: 'pdf', label: 'Full score' });

    assert.deepEqual(
      resolveLinkAddition({
        existing: [existing],
        label: 'Another label',
        url: ' https://example.org/score ',
      }),
      { message: 'Already added as Full score.', status: 'refused' },
    );
  });

  it('detects a PDF link and suggests a label the user can change', () => {
    assert.deepEqual(
      resolveLinkAddition({
        label: '',
        url: ' https://example.org/scores/kyrie-alto.pdf ',
      }),
      {
        addition: {
          format: 'pdf',
          label: 'kyrie-alto',
          location: {
            kind: 'url',
            url: 'https://example.org/scores/kyrie-alto.pdf',
          },
        },
        status: 'ready',
      },
    );
  });

  it('keeps a typed label', () => {
    const result = resolveLinkAddition({
      label: 'Alto part',
      url: 'https://example.org/a.mid',
    });

    assert.equal(
      result.status === 'ready' && result.addition.label,
      'Alto part',
    );
  });

  it('accepts a MuseScore page as a link-out source', () => {
    const result = resolveLinkAddition({
      label: '',
      url: 'https://musescore.com/user/1/scores/2',
    });

    assert.equal(
      result.status === 'ready' && result.addition.format,
      'musescore',
    );
  });

  it('labels a MuseScore page by what it is, not by its score number', () => {
    const result = resolveLinkAddition({
      label: '',
      url: 'https://musescore.com/user/1/scores/2',
    });

    assert.equal(
      result.status === 'ready' && result.addition.label,
      'MuseScore score',
    );
  });

  it('labels a .mscz link by its file name', () => {
    const result = resolveLinkAddition({
      label: '',
      url: 'https://example.org/Kyrie_alto.mscz',
    });

    assert.equal(
      result.status === 'ready' && result.addition.label,
      'Kyrie alto',
    );
  });

  it('keeps a link with no clear extension as an outside link', () => {
    const result = resolveLinkAddition({
      label: '',
      url: 'https://example.org/download?id=3',
    });

    assert.equal(result.status === 'ready' && result.addition.format, 'link');
  });

  it('refuses text that is not a web link', () => {
    assert.deepEqual(resolveLinkAddition({ label: '', url: 'kyrie.pdf' }), {
      message: INVALID_LINK_MESSAGE,
      status: 'refused',
    });
  });

  it('names the supported formats when the file type is not one', () => {
    assert.deepEqual(
      resolveLinkAddition({ label: '', url: 'https://example.org/k.docx' }),
      { message: SUPPORTED_FORMATS_MESSAGE, status: 'refused' },
    );
  });
});

describe('suggestLabelFromFileName', () => {
  it('drops the extension and reads underscores as spaces', () => {
    assert.equal(
      suggestLabelFromFileName('Ave_Maria_SATB.pdf'),
      'Ave Maria SATB',
    );
  });

  it('keeps a name with nothing left after cleaning', () => {
    assert.equal(suggestLabelFromFileName('.pdf'), '.pdf');
  });
});
