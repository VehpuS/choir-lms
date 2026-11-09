import assert from 'node:assert/strict';
import { describe, it } from 'node:test';

import { parseLibraryBundle } from '@org/audio-library-models';

import { buildLibraryBundle } from './library-bundle-builder.ts';
import {
  AT,
  AUTHOR,
  input,
  SOPRANO,
  OUTSIDE,
  composite,
} from './library-bundle-test-fixtures.ts';

const build = (scope: Parameters<typeof buildLibraryBundle>[0]['scope']) =>
  buildLibraryBundle({ input: input(), scope, author: AUTHOR, createdAt: AT });

describe('buildLibraryBundle for the whole library', () => {
  const { bundle, leftOutReferenceCount } = build({ kind: 'library' });

  it('holds every entity and mirrors the tree under the root', () => {
    assert.deepEqual(bundle.scope, { kind: 'library' });
    assert.equal(bundle.sources.length, 4);
    assert.equal(bundle.loops.length, 2);
    assert.equal(bundle.playlists.length, 1);
    assert.equal(bundle.composites.length, 2);
    assert.equal(bundle.folders.length, 3);
    assert.equal(bundle.fileLinks.length, 10);
    assert.equal(leftOutReferenceCount, 0);
    assert.equal(
      bundle.folders.find((f) => f.name === 'folder:messiah')?.parentFolderId,
      null,
    );
  });

  it('rewrites every reference to ids inside the bundle and leaks no library id', () => {
    const text = JSON.stringify(bundle);

    for (const libraryId of [
      SOPRANO.id,
      'adjusted:1',
      'loop-in',
      'comp-in',
      'device-stem',
      'folder:library-root',
      'local-device-user',
    ]) {
      assert.equal(text.includes(libraryId), false, libraryId);
    }

    const parsed = parseLibraryBundle(text);

    assert.equal(parsed.status, 'ok');
    assert.equal(parsed.status === 'ok' && parsed.droppedTotal, 0);
  });

  it('records owners only where Drive reported one', () => {
    const result = buildLibraryBundle({
      input: input(),
      scope: { kind: 'library' },
      author: AUTHOR,
      createdAt: AT,
      ownersByDriveFileId: {
        'd-alt': { name: 'Ann', email: 'ann@example.com' },
      },
    });

    assert.deepEqual(
      result.bundle.sources.map((s) => s.owner?.email),
      [undefined, 'ann@example.com', undefined, undefined],
    );
  });

  it('keeps stem levels and the lyrics stem under the new stem ids', () => {
    const first = bundle.composites[0];

    assert.deepEqual(Object.keys(first.defaultMix.levels), [first.stems[0].id]);
    assert.equal(first.lyricsStemId, first.stems[1].id);
  });
});

describe('buildLibraryBundle for a folder', () => {
  const { bundle, leftOutReferenceCount } = build({
    kind: 'folder',
    folderId: 'folder:messiah',
  });

  it('names the scope and puts the folder contents at the top', () => {
    assert.deepEqual(bundle.scope, { kind: 'folder', name: 'folder:messiah' });
    assert.deepEqual(
      bundle.folders.map((f) => [f.name, f.parentFolderId]),
      [['folder:parts', null]].map(([name]) => [name, null]),
    );
  });

  it('brings the adjusted track of an included track, wherever it lives', () => {
    assert.deepEqual(
      bundle.sources.map((s) => s.name),
      ['Soprano', 'Alto', 'Soprano slow'],
    );
    assert.equal(bundle.sources[2].adjustment?.sourceRef, bundle.sources[0].id);
  });

  it('leaves outside tracks and loops out and counts the references', () => {
    assert.equal(
      bundle.sources.some((s) => s.name === 'Elsewhere'),
      false,
    );
    assert.deepEqual(
      bundle.loops.map((l) => l.name),
      ['Entrance'],
    );
    // outside playlist entry (1) + the comp-mixed stem outside (1)
    assert.equal(leftOutReferenceCount, 2);
  });

  it('keeps in-scope playlist entries and composites with their in-scope stems', () => {
    assert.deepEqual(
      bundle.playlists[0].items.map((i) => i.kind),
      ['track', 'loop', 'composite'],
    );
    assert.equal(bundle.composites.length, 1);
  });

  it('links dependents that live elsewhere at the top of the bundle', () => {
    const slow = bundle.sources.find((s) => s.adjustment)?.id;
    const slowLink = bundle.fileLinks.find((l) => l.entityId === slow);

    assert.equal(slowLink?.parentFolderId, null);
    assert.equal(
      parseLibraryBundle(JSON.stringify(bundle)).status === 'ok' &&
        (parseLibraryBundle(JSON.stringify(bundle)) as { droppedTotal: number })
          .droppedTotal,
      0,
    );
  });

  it('does not export a composite left with fewer than two stems, and counts it when the folder held it', () => {
    const lonely = buildLibraryBundle({
      input: {
        ...input(),
        composites: [composite('comp-mixed', [SOPRANO.id, OUTSIDE.id])],
      },
      scope: { kind: 'folder', folderId: 'folder:parts' },
      author: AUTHOR,
      createdAt: AT,
    });

    assert.equal(lonely.bundle.composites.length, 0);
    // comp-mixed is linked in folder:messiah, not in parts, so it is not
    // counted; the playlist's outside track and composite entries are.
    assert.equal(lonely.leftOutReferenceCount, 2);
  });
});

describe('buildLibraryBundle for a folder with outside references included', () => {
  const withOutside = () =>
    buildLibraryBundle({
      input: input(),
      scope: { kind: 'folder', folderId: 'folder:messiah' },
      author: AUTHOR,
      createdAt: AT,
      includeOutsideReferences: true,
    });

  it('brings in what the folder’s playlists and composites use, and leaves nothing out', () => {
    const { bundle, leftOutReferenceCount, includedOutsideItemCount } =
      withOutside();

    assert.deepEqual(
      bundle.sources.map((s) => s.name),
      ['Soprano', 'Alto', 'Elsewhere', 'Soprano slow'],
    );
    assert.equal(bundle.playlists[0].items.length, 4);
    assert.equal(bundle.composites.length, 2);
    assert.equal(
      bundle.composites.every((c) => c.stems.length === 2),
      true,
    );
    assert.equal(leftOutReferenceCount, 0);
    assert.equal(includedOutsideItemCount, 1);
  });

  it('does not pull in loops nothing refers to, or unrelated playlists', () => {
    const { bundle } = withOutside();

    assert.deepEqual(
      bundle.loops.map((l) => l.name),
      ['Entrance'],
    );
    assert.equal(bundle.playlists.length, 1);
  });

  it('puts the outside items at the top of the bundle and parses cleanly', () => {
    const { bundle } = withOutside();
    const elsewhere = bundle.sources.find((s) => s.name === 'Elsewhere');
    const link = bundle.fileLinks.find((l) => l.entityId === elsewhere?.id);

    assert.equal(link?.parentFolderId, null);
    assert.equal(parseLibraryBundle(JSON.stringify(bundle)).status, 'ok');
  });

  it('adds nothing and changes nothing when the option is off', () => {
    const { includedOutsideItemCount } = build({
      kind: 'folder',
      folderId: 'folder:messiah',
    });

    assert.equal(includedOutsideItemCount, 0);
  });
});
