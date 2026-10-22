import assert from 'node:assert/strict';
import { describe, it } from 'node:test';

import { replaceSourceLocationWithDrive } from './source-sheet-music-drive-copy.ts';
import {
  createSheetMusicSource,
  type SheetMusicSource,
} from './source-sheet-music.ts';

const ADDED_AT = '2026-01-01T00:00:00.000Z';

const buildSource = (
  id: string,
  overrides: Partial<SheetMusicSource> = {},
): SheetMusicSource => ({
  addedAt: ADDED_AT,
  format: 'link',
  id,
  label: `Score ${id}`,
  location: { kind: 'url', url: `https://host.example/download/${id}` },
  ...overrides,
});

describe('replaceSourceLocationWithDrive', () => {
  it('swaps the location and keeps the id, label, part selection, and added time', () => {
    const [result] = replaceSourceLocationWithDrive(
      [buildSource('a', { partSelection: { include: ['Alto'] } })],
      'a',
      { fileId: 'drive-1', name: 'Kyrie.pdf' },
    );

    assert.deepEqual(result, {
      addedAt: ADDED_AT,
      format: 'pdf',
      id: 'a',
      label: 'Score a',
      location: { kind: 'drive', fileId: 'drive-1', name: 'Kyrie.pdf' },
      partSelection: { include: ['Alto'] },
    });
  });

  it('re-detects the format from the saved file name', () => {
    const cases: Array<[string, string]> = [
      ['Score.musicxml', 'musicxml'],
      ['Score.mxl', 'musicxml'],
      ['Reduction.mid', 'midi'],
    ];

    for (const [name, format] of cases) {
      const [result] = replaceSourceLocationWithDrive(
        [buildSource('a', { format: 'pdf' })],
        'a',
        { fileId: 'x', name },
      );

      assert.equal(result?.format, format, name);
    }
  });

  it('keeps the old format when the saved name is not recognised', () => {
    const [result] = replaceSourceLocationWithDrive(
      [buildSource('a', { format: 'pdf' })],
      'a',
      { fileId: 'x', name: 'Score.docx' },
    );

    assert.equal(result?.format, 'pdf');
  });

  it('changes only the matching source', () => {
    const sources = [buildSource('a'), buildSource('b')];
    const result = replaceSourceLocationWithDrive(sources, 'b', {
      fileId: 'x',
      name: 'B.pdf',
    });

    assert.deepEqual(result[0], sources[0]);
    assert.equal(result[1]?.location.kind, 'drive');
  });

  it('does nothing for an unknown id, such as a source removed mid-upload', () => {
    const sources = [buildSource('a')];

    assert.deepEqual(
      replaceSourceLocationWithDrive(sources, 'gone', {
        fileId: 'x',
        name: 'A.pdf',
      }),
      sources,
    );
    assert.deepEqual(
      replaceSourceLocationWithDrive([], 'a', { fileId: 'x', name: 'A.pdf' }),
      [],
    );
  });

  it('works on sources built by the add flow', () => {
    const source = createSheetMusicSource({
      addedAt: ADDED_AT,
      format: 'link',
      id: 'a',
      label: 'Score',
      location: { kind: 'url', url: 'https://host.example/get?id=1' },
    });

    assert.ok(source);
    assert.equal(
      replaceSourceLocationWithDrive([source], 'a', {
        fileId: 'x',
        name: 'S.pdf',
      })[0]?.format,
      'pdf',
    );
  });
});
