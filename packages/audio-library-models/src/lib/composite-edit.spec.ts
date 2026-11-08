import assert from 'node:assert/strict';
import { describe, it } from 'node:test';

import {
  createCompositeTrack,
  relinkCompositeStem,
  removeCompositeStem,
  renameComposite,
  renameCompositeStem,
  setCompositeStemMine,
  setCompositeStemOffset,
  type CompositeDraft,
} from './composite-edit.ts';

const CREATED_AT = '2026-11-08T10:00:00.000Z';

const draft: CompositeDraft = {
  name: '  Ubi   caritas ',
  stems: [
    { trackId: 't-s', name: 'Soprano' },
    { trackId: 't-a', name: ' Alto ' },
    { trackId: 't-b', name: 'Bass' },
  ],
};

const make = (partPreferences: string[] = []) => {
  const composite = createCompositeTrack({
    draft,
    partPreferences,
    createdAt: CREATED_AT,
    createId: () => 'c1',
  });

  assert.ok(composite);

  return composite;
};

describe('createCompositeTrack', () => {
  it('saves the stems in order with stable ids and neutral settings', () => {
    const composite = make();

    assert.equal(composite.id, 'c1');
    assert.equal(composite.name, 'Ubi caritas');
    assert.equal(composite.createdAt, CREATED_AT);
    assert.deepEqual(
      composite.stems.map((s) => [s.id, s.trackId, s.name, s.offsetMs, s.mine]),
      [
        ['stem-1', 't-s', 'Soprano', 0, false],
        ['stem-2', 't-a', 'Alto', 0, false],
        ['stem-3', 't-b', 'Bass', 0, false],
      ],
    );
    assert.deepEqual(composite.defaultMix, { levels: {} });
    assert.deepEqual(composite.presets, []);
  });

  it('marks the stem the part preferences point at', () => {
    const composite = make(['Bass']);

    assert.deepEqual(
      composite.stems.map((s) => s.mine),
      [false, false, true],
    );
  });

  it('gives a generated id when none is injected', () => {
    const composite = createCompositeTrack({ draft, createdAt: CREATED_AT });

    assert.match(composite?.id ?? '', /^composite-\d+-[a-z0-9]+$/);
  });

  it('refuses fewer than two distinct tracks', () => {
    assert.equal(
      createCompositeTrack({
        draft: { name: 'x', stems: [{ trackId: 't', name: 'A' }] },
      }),
      null,
    );
    assert.equal(
      createCompositeTrack({
        draft: {
          name: 'x',
          stems: [
            { trackId: 't', name: 'A' },
            { trackId: 't', name: 'B' },
          ],
        },
      }),
      null,
    );
  });

  it('names a stem or composite that arrives nameless', () => {
    const composite = createCompositeTrack({
      draft: {
        name: '  ',
        stems: [
          { trackId: 'a', name: '' },
          { trackId: 'b', name: 'B' },
        ],
      },
    });

    assert.equal(composite?.name, 'New composite');
    assert.equal(composite?.stems[0].name, 'Stem 1');
  });
});

describe('editing a composite', () => {
  it('renames the composite and keeps the name when emptied', () => {
    assert.equal(renameComposite(make(), ' Evening  set ').name, 'Evening set');
    assert.equal(renameComposite(make(), '   ').name, 'Ubi caritas');
  });

  it('renames a stem and keeps the name when emptied', () => {
    assert.equal(
      renameCompositeStem(make(), 'stem-2', 'Alto 1').stems[1].name,
      'Alto 1',
    );
    assert.equal(
      renameCompositeStem(make(), 'stem-2', '').stems[1].name,
      'Alto',
    );
  });

  it('sets an offset in whole milliseconds and ignores a value that is not a number', () => {
    assert.equal(
      setCompositeStemOffset(make(), 'stem-1', 250.4).stems[0].offsetMs,
      250,
    );
    assert.equal(
      setCompositeStemOffset(make(), 'stem-1', -100).stems[0].offsetMs,
      -100,
    );
    assert.equal(
      setCompositeStemOffset(make(), 'stem-1', Number.NaN).stems[0].offsetMs,
      0,
    );
  });

  it('moves the part mark when another stem becomes the user’s', () => {
    const marked = setCompositeStemMine(make(['Bass']), 'stem-1', true);

    assert.deepEqual(
      marked.stems.map((s) => s.mine),
      [true, false, false],
    );
  });

  it('re-links a stem to another track, but not to one already used', () => {
    assert.equal(
      relinkCompositeStem(make(), 'stem-1', 't-new').stems[0].trackId,
      't-new',
    );
    assert.equal(
      relinkCompositeStem(make(), 'stem-1', 't-a').stems[0].trackId,
      't-s',
    );
  });

  it('removes a stem, and asks about deleting when only one would remain', () => {
    const removed = removeCompositeStem(make(), 'stem-2');

    assert.equal(removed.outcome, 'removed');
    assert.ok(removed.outcome === 'removed');
    assert.deepEqual(
      removed.composite.stems.map((s) => s.id),
      ['stem-1', 'stem-3'],
    );
    assert.equal(
      removeCompositeStem(removed.composite, 'stem-1').outcome,
      'ask-delete',
    );
    assert.equal(removeCompositeStem(make(), 'nope').outcome, 'unchanged');
  });

  it('forgets a lyrics pick of a stem that is removed', () => {
    const picked = { ...make(), lyricsStemId: 'stem-2' };
    const removed = removeCompositeStem(picked, 'stem-2');

    assert.ok(removed.outcome === 'removed');
    assert.equal(removed.composite.lyricsStemId, undefined);
  });
});
