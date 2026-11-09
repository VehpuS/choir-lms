import assert from 'node:assert/strict';
import { describe, it } from 'node:test';

import type { SheetMusicSource } from '@org/audio-library-models';

import { buildCompositeSheetMusicView } from './composite-sheet-music-model';

const pdf = (id: string, fileId: string): SheetMusicSource => ({
  id,
  label: fileId,
  location: { kind: 'drive', fileId, name: `${fileId}.pdf` },
  format: 'pdf',
  addedAt: '2026-11-09T00:00:00.000Z',
});
const composite = {
  stems: [
    { id: 's1', trackId: 't-s', name: 'Soprano' },
    { id: 's2', trackId: 't-b', name: 'Bass' },
  ],
  sheetMusic: [pdf('own', 'midi')],
};
const tracks = [
  { id: 't-s', sheetMusic: [pdf('a', 'score')] },
  { id: 't-b', sheetMusic: [pdf('b', 'score'), pdf('c', 'bass-part')] },
];

describe('buildCompositeSheetMusicView', () => {
  const view = buildCompositeSheetMusicView(composite as never, tracks);

  it('lists each file once with who uses it', () => {
    assert.deepEqual(
      view.sources.map(({ id }) => id),
      ['a', 'c', 'own'],
    );
    assert.equal(view.useLines.get('a'), 'Used by all 2 stems');
    assert.equal(view.useLines.get('c'), 'Used by Bass');
    assert.equal(view.useLines.get('own'), 'Added to this composite');
  });

  it('lets only the composite edit what it added', () => {
    assert.deepEqual([...view.editableIds], ['own']);
    assert.equal(view.ownCount, 1);
  });

  it('writes to the track that links a file, or the composite', () => {
    assert.deepEqual(view.resolveWriteTarget('c'), {
      kind: 'track',
      trackId: 't-b',
    });
    assert.deepEqual(view.resolveWriteTarget('own'), { kind: 'composite' });
    assert.equal(view.resolveWriteTarget('nope'), undefined);
  });

  it('shows only what the composite added when its tracks have none', () => {
    const bare = buildCompositeSheetMusicView(composite as never, []);

    assert.deepEqual(
      bare.sources.map(({ id }) => id),
      ['own'],
    );
  });
});
