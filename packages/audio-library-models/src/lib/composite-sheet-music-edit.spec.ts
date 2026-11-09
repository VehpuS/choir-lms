import assert from 'node:assert/strict';
import { describe, it } from 'node:test';

import {
  addCompositeSheetMusic,
  changeCompositeSheetMusic,
  removeCompositeSheetMusic,
  replaceCompositeSheetMusicWithDrive,
} from './composite-sheet-music-edit.ts';
import { createCompositeTrack } from './composite-edit.ts';

const make = () => {
  const composite = createCompositeTrack({
    draft: {
      name: 'Ubi caritas',
      stems: [
        { trackId: 't-s', name: 'Soprano' },
        { trackId: 't-a', name: 'Alto' },
        { trackId: 't-b', name: 'Bass' },
      ],
    },
    createdAt: '2026-11-08T10:00:00.000Z',
    createId: () => 'c1',
  });

  assert.ok(composite);

  return composite;
};

describe('sheet music added to a composite', () => {
  const pdf = {
    format: 'pdf' as const,
    label: 'Score',
    location: { kind: 'drive' as const, fileId: 'f1', name: 'score.pdf' },
  };

  it('adds, renames, changes the layout and removes on the composite only', () => {
    const added = addCompositeSheetMusic(make(), pdf, { id: 'sm1' });

    assert.equal(added.sheetMusic?.length, 1);
    assert.equal(added.stems.length, 3);

    const renamed = changeCompositeSheetMusic(added, 'sm1', {
      label: 'Full score',
      pdfLayout: 'pages',
    });

    assert.equal(renamed.sheetMusic?.[0].label, 'Full score');
    assert.equal(renamed.sheetMusic?.[0].pdfLayout, 'pages');

    const removed = removeCompositeSheetMusic(renamed, 'sm1');

    assert.equal('sheetMusic' in removed, false);
  });

  it('keeps the per-record cap on the composite list', () => {
    let composite = make();

    for (let index = 0; index < 12; index += 1) {
      composite = addCompositeSheetMusic(
        composite,
        { ...pdf, location: { ...pdf.location, fileId: `f${index}` } },
        { id: `sm${index}` },
      );
    }

    assert.equal(composite.sheetMusic?.length, 10);
  });

  it('points a link at its Drive copy, keeping its id and label', () => {
    const linked = addCompositeSheetMusic(
      make(),
      {
        format: 'pdf',
        label: 'Web score',
        location: { kind: 'url', url: 'https://example.com/a.pdf' },
      },
      { id: 'sm1' },
    );
    const saved = replaceCompositeSheetMusicWithDrive(linked, 'sm1', {
      fileId: 'd1',
      name: 'a.pdf',
    });

    assert.equal(saved.sheetMusic?.[0].id, 'sm1');
    assert.equal(saved.sheetMusic?.[0].label, 'Web score');
    assert.deepEqual(saved.sheetMusic?.[0].location, {
      kind: 'drive',
      fileId: 'd1',
      name: 'a.pdf',
    });
  });
});
