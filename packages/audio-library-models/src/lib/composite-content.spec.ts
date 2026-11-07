import assert from 'node:assert/strict';
import { describe, it } from 'node:test';

import {
  buildCompositeLyricsPicker,
  buildCompositeSheetMusic,
} from './composite-content.ts';
import type { SheetMusicSource } from './source-sheet-music.ts';

const driveSource = (id: string, fileId: string): SheetMusicSource => ({
  id,
  label: fileId,
  location: { kind: 'drive', fileId, name: `${fileId}.pdf` },
  format: 'pdf',
  addedAt: '2026-11-07T00:00:00.000Z',
});
const stems = ['Soprano', 'Alto', 'Tenor', 'Bass'].map((name) => ({
  id: name,
  name,
}));

describe('buildCompositeSheetMusic', () => {
  it('lists a file shared by all stems once and a part file once', () => {
    const entries = buildCompositeSheetMusic(
      stems.map((stem) => ({
        ...stem,
        sheetMusic: [
          driveSource(`score-${stem.id}`, 'score'),
          ...(stem.id === 'Bass' ? [driveSource('part', 'bass-part')] : []),
        ],
      })),
    );

    assert.equal(entries.length, 2);
    assert.equal(entries[0].usedByAllStems, true);
    assert.equal(entries[0].usedByStems.length, 4);
    assert.deepEqual(
      entries[1].usedByStems.map((s) => s.name),
      ['Bass'],
    );
    assert.equal(entries[1].usedByAllStems, false);
  });

  it('marks a file added to the composite and leaves stems alone', () => {
    const midi = {
      ...driveSource('midi', 'guide'),
      format: 'midi' as const,
    };
    const entries = buildCompositeSheetMusic(
      stems.map((stem) => ({ ...stem, sheetMusic: undefined })),
      [midi],
    );

    assert.equal(entries.length, 1);
    assert.equal(entries[0].addedToComposite, true);
    assert.deepEqual(entries[0].usedByStems, []);
  });

  it('merges a composite source with the same location as a stem source', () => {
    const entries = buildCompositeSheetMusic(
      [
        { ...stems[0], sheetMusic: [driveSource('a', 'score')] },
        { ...stems[1], sheetMusic: undefined },
      ],
      [driveSource('b', 'score')],
    );

    assert.equal(entries.length, 1);
    assert.equal(entries[0].addedToComposite, true);
    assert.equal(entries[0].usedByAllStems, false);
  });

  it('de-duplicates urls and does not cap the union at ten', () => {
    const many = stems.map((stem, index) => ({
      ...stem,
      sheetMusic: Array.from({ length: 10 }, (_, n) =>
        driveSource(`s${index}-${n}`, `file-${index}-${n}`),
      ),
    }));

    assert.equal(buildCompositeSheetMusic(many).length, 40);

    const url = (id: string): SheetMusicSource => ({
      ...driveSource(id, 'x'),
      location: { kind: 'url', url: 'https://example.com/score.pdf' },
    });

    assert.equal(
      buildCompositeSheetMusic([
        { ...stems[0], sheetMusic: [url('u1')] },
        { ...stems[1], sheetMusic: [url('u2')] },
      ]).length,
      1,
    );
  });
});

describe('buildCompositeLyricsPicker', () => {
  const lyricsOf = (text: string) => ({ text });

  it('offers a picker when two stems have lyrics and names the others', () => {
    const picker = buildCompositeLyricsPicker(
      stems.map((stem) => ({
        ...stem,
        lyrics: ['Soprano', 'Alto'].includes(stem.id)
          ? lyricsOf('la')
          : undefined,
      })),
    );

    assert.equal(picker.showPicker, true);
    assert.equal(picker.selectedStemId, 'Soprano');
    assert.deepEqual(
      picker.withoutLyrics.map((s) => s.name),
      ['Tenor', 'Bass'],
    );
  });

  it('defaults to the remembered pick while it still has lyrics', () => {
    const withLyrics = stems.map((stem) => ({
      ...stem,
      lyrics: lyricsOf('la'),
    }));

    assert.equal(
      buildCompositeLyricsPicker(withLyrics, 'Tenor').selectedStemId,
      'Tenor',
    );
    assert.equal(
      buildCompositeLyricsPicker(
        withLyrics.map((s) =>
          s.id === 'Tenor' ? { ...s, lyrics: undefined } : s,
        ),
        'Tenor',
      ).selectedStemId,
      'Soprano',
    );
  });

  it('shows no picker when one stem has lyrics', () => {
    const picker = buildCompositeLyricsPicker(
      stems.map((stem) => ({
        ...stem,
        lyrics: stem.id === 'Soprano' ? lyricsOf('la') : undefined,
      })),
    );

    assert.equal(picker.showPicker, false);
    assert.equal(picker.selectedStemId, 'Soprano');
  });

  it('is empty when no stem has lyrics, including blank text', () => {
    const picker = buildCompositeLyricsPicker(
      stems.map((stem) => ({
        ...stem,
        lyrics: stem.id === 'Alto' ? lyricsOf('  ') : undefined,
      })),
      'Alto',
    );

    assert.equal(picker.empty, true);
    assert.equal(picker.selectedStemId, undefined);
    assert.equal(picker.withoutLyrics.length, 4);
  });
});
