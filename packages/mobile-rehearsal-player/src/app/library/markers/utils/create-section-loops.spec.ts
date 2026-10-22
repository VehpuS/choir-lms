import assert from 'node:assert/strict';
import { describe, it } from 'node:test';

import type { MarkerSection, NamedLoop } from '@org/audio-library-models';

import type { DriveLibrarySource } from '../../drive/utils/drive-library-view-model';
import { createSectionLoops } from './create-section-loops';

const SOURCE = {
  id: 'source-1',
  name: 'Ave Maria',
  durationMs: 120_000,
} as DriveLibrarySource;
const NOW = '2026-10-22T00:00:00.000Z';

const section = (
  key: string,
  name: string,
  startMs: number,
  endMs: number,
): MarkerSection => ({ key, name, startMs, endMs });

const SECTIONS = [
  section('a', 'Verse', 10_000, 40_000),
  section('b', 'Chorus', 40_000, 80_000),
];

describe('createSectionLoops', () => {
  it('saves each section as a named loop on the source, in order, without tags', async () => {
    const saved: NamedLoop[] = [];

    const didSaveAll = await createSectionLoops({
      now: NOW,
      ownerId: 'owner-1',
      saveLoop: (loop) => {
        saved.push(loop);
        return Promise.resolve(true);
      },
      sections: SECTIONS,
      source: SOURCE,
    });

    assert.equal(didSaveAll, true);
    assert.deepEqual(
      saved.map(({ name, sourceId, startMs, endMs }) => [
        name,
        sourceId,
        startMs,
        endMs,
      ]),
      [
        ['Verse', 'source-1', 10_000, 40_000],
        ['Chorus', 'source-1', 40_000, 80_000],
      ],
    );
    assert.equal(
      saved.every((loop) => loop.tags === undefined),
      true,
    );
  });

  it('gives loops created together distinct ids', async () => {
    const ids: string[] = [];

    await createSectionLoops({
      now: NOW,
      ownerId: 'owner-1',
      saveLoop: (loop) => {
        ids.push(loop.id);
        return Promise.resolve(true);
      },
      sections: SECTIONS,
      source: SOURCE,
    });

    assert.equal(new Set(ids).size, 2);
  });

  it('stops at the first loop that fails to save', async () => {
    const names: string[] = [];

    const didSaveAll = await createSectionLoops({
      now: NOW,
      ownerId: 'owner-1',
      saveLoop: (loop) => {
        names.push(loop.name);
        return Promise.resolve(false);
      },
      sections: SECTIONS,
      source: SOURCE,
    });

    assert.equal(didSaveAll, false);
    assert.deepEqual(names, ['Verse']);
  });

  it('reports a section that is not a valid loop without saving it', async () => {
    const names: string[] = [];

    const didSaveAll = await createSectionLoops({
      now: NOW,
      ownerId: 'owner-1',
      saveLoop: (loop) => {
        names.push(loop.name);
        return Promise.resolve(true);
      },
      sections: [section('x', 'Backwards', 50_000, 40_000)],
      source: SOURCE,
    });

    assert.equal(didSaveAll, false);
    assert.deepEqual(names, []);
  });

  it('succeeds with nothing to save', async () => {
    assert.equal(
      await createSectionLoops({
        ownerId: 'owner-1',
        saveLoop: () => Promise.resolve(false),
        sections: [],
        source: SOURCE,
      }),
      true,
    );
  });
});
