import assert from 'node:assert/strict';
import { describe, it } from 'node:test';

import type { CompositeTrack } from '@org/audio-library-models';

import { buildCompositeSheetMusicView } from './composite-sheet-music-model';
import { resolveCompositeSheetMusicOps } from './composite-sheet-music-ops';

const pdf = (id: string, fileId: string) => ({
  id,
  label: fileId,
  location: { kind: 'drive' as const, fileId, name: `${fileId}.pdf` },
  format: 'pdf' as const,
  addedAt: '2026-11-09T00:00:00.000Z',
});
const composite = {
  id: 'c1',
  name: 'Ubi',
  stems: [{ id: 's1', trackId: 't-b', name: 'Bass' }],
  sheetMusic: [pdf('own', 'midi')],
} as unknown as CompositeTrack;
const track = { id: 't-b', name: 'Bass', sheetMusic: [pdf('part', 'part')] };

const setup = () => {
  const calls: string[] = [];
  const store = {
    addSheetMusic: async (id: string) => void calls.push(`store.add ${id}`),
    changeSheetMusic: async (_c: string, id: string) =>
      void calls.push(`store.change ${id}`),
    removeSheetMusic: async (_c: string, id: string) =>
      void calls.push(`store.remove ${id}`),
    replaceSheetMusicWithDrive: async (_c: string, id: string) =>
      void calls.push(`store.replace ${id}`),
  };
  const sheetMusic = {
    updateSheetMusic: async (item: { id: string }, id: string) =>
      calls.push(`track.update ${item.id} ${id}`) > 0,
    removeSheetMusic: async (item: { id: string }, id: string) =>
      calls.push(`track.remove ${item.id} ${id}`) > 0,
  };
  const ops = resolveCompositeSheetMusicOps({
    composite,
    savedLibrarySources: [track] as never,
    sheetMusic: sheetMusic as never,
    store,
    trackItem: null,
    view: buildCompositeSheetMusicView(composite, [track] as never),
  });

  assert.ok(ops);

  return { calls, ops };
};

describe('resolveCompositeSheetMusicOps', () => {
  it('adds to the composite and edits a stem’s file on its track', async () => {
    const { calls, ops } = setup();

    await ops.add({
      format: 'pdf',
      label: 'x',
      location: { kind: 'drive', fileId: 'f', name: 'f.pdf' },
    });
    await ops.update('part', { label: 'Renamed' });
    await ops.update('own', { label: 'Renamed' });
    await ops.remove('own');

    assert.deepEqual(calls, [
      'store.add c1',
      'track.update t-b part',
      'store.change own',
      'store.remove own',
    ]);
  });

  it('refuses an unknown source and reports a failed write', async () => {
    const { ops } = setup();

    assert.equal(await ops.remove('nope'), false);
  });

  it('is null with no composite and no track', () => {
    assert.equal(
      resolveCompositeSheetMusicOps({
        composite: undefined,
        savedLibrarySources: [],
        sheetMusic: {} as never,
        store: {} as never,
        trackItem: null,
        view: null,
      }),
      null,
    );
  });
});
