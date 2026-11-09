import assert from 'node:assert/strict';
import { describe, it } from 'node:test';

import {
  parseLibraryBundle,
  type DriveAudioSource,
  type LibraryBundle,
  type RehearsalLibraryFileTree,
} from '@org/audio-library-models';

import { buildLibraryBundle } from './library-bundle-builder.ts';
import {
  planLibraryBundleImport,
  type LibraryBundleImportOptions,
} from './library-bundle-import-plan.ts';
import { ALTO, AT, input, SOPRANO } from './library-bundle-test-fixtures.ts';

const ROOT = 'folder:library-root';
const IMPORTED_AT = '2026-12-01T09:00:00.000Z';

const emptyState = (): LibraryBundleImportOptions['state'] => ({
  entityCollections: { sources: [], loops: [], playlists: [], composites: [] },
  tree: {
    version: 1,
    rootFolderId: ROOT,
    folders: [
      { id: ROOT, name: 'Library', parentFolderId: null, createdAt: AT },
    ],
    fileLinks: [],
  } satisfies RehearsalLibraryFileTree,
});

/** The whole fixture library as a parsed bundle, as an importer would receive it. */
const fixtureBundle = (): LibraryBundle => {
  const { bundle } = buildLibraryBundle({
    input: input(),
    scope: { kind: 'library' },
    author: { name: 'Dana Director' },
    createdAt: AT,
  });
  const parsed = parseLibraryBundle(JSON.stringify(bundle));

  assert.equal(parsed.status, 'ok');

  return (parsed as { bundle: LibraryBundle }).bundle;
};

const plan = (overrides: Partial<LibraryBundleImportOptions> = {}) =>
  planLibraryBundleImport({
    bundle: fixtureBundle(),
    bundleName: 'choir-lms-backup.json',
    destinationFolderId: ROOT,
    importId: 'imp1',
    importedAt: IMPORTED_AT,
    ownerId: 'local-device-user',
    state: emptyState(),
    ...overrides,
  });

const stateWith = (sources: DriveAudioSource[]) => {
  const state = emptyState();

  state.entityCollections.sources = sources;

  return state;
};

describe('planLibraryBundleImport into an empty library', () => {
  const result = plan();

  it('creates a new import folder under the destination, marked with its origin', () => {
    assert.equal(result.rootFolder.name, 'Imported library 2026-12-01');
    assert.equal(result.rootFolder.parentFolderId, ROOT);
    assert.deepEqual(result.rootFolder.importedFrom, {
      author: 'Dana Director',
      bundleName: 'choir-lms-backup.json',
      importedAt: IMPORTED_AT,
    });
  });

  it('recreates the tree beneath the root and links every entity', () => {
    assert.equal(result.folders.length, 3);
    assert.equal(
      result.folders.every((f) => f.parentFolderId !== null),
      true,
    );
    assert.equal(result.fileLinks.length, 10);

    const folderIds = new Set([
      result.rootFolder.id,
      ...result.folders.map((f) => f.id),
    ]);

    assert.equal(
      result.fileLinks.every((l) => folderIds.has(l.parentFolderId)),
      true,
    );
  });

  it('maps every reference to the new ids and marks created entities', () => {
    const sourceIds = new Set(result.newSources.map((s) => s.id));
    const loopIds = new Set(result.loops.map((l) => l.id));

    assert.equal(
      result.loops.every((l) => sourceIds.has(l.sourceId)),
      true,
    );
    assert.equal(
      result.composites.every((c) =>
        c.stems.every((st) => sourceIds.has(st.trackId)),
      ),
      true,
    );
    for (const entry of result.playlists.flatMap((p) => p.items)) {
      const ok =
        entry.kind === 'composite'
          ? result.composites.some((c) => c.id === entry.sourceId)
          : sourceIds.has(entry.sourceId) &&
            (entry.loopId === undefined || loopIds.has(entry.loopId));

      assert.equal(ok, true, entry.id);
    }
    assert.equal(
      result.loops.every((l) => l.importedFrom?.author === 'Dana Director'),
      true,
    );
    assert.equal(
      result.newSources.every((s) => s.importedFrom !== undefined),
      true,
    );
    assert.equal(
      result.loops.every((l) => l.ownerId === 'local-device-user'),
      true,
    );
  });

  it('points an adjusted track at the imported original', () => {
    const adjusted = result.newSources.find((s) => s.adjustment);
    const original = result.newSources.find((s) => s.name === SOPRANO.name);

    assert.equal(adjusted?.adjustment?.sourceRef, original?.id);
    assert.equal(
      result.newSources.indexOf(original as DriveAudioSource) <
        result.newSources.indexOf(adjusted as DriveAudioSource),
      true,
    );
  });

  it('summarises what it will do', () => {
    assert.deepEqual(result.summary, {
      newTracks: 4,
      reusedTracks: 0,
      needsAccessTracks: 0,
      loops: 2,
      playlists: 1,
      composites: 2,
      folders: 4,
      alreadyImported: 0,
    });
  });
});

describe('planLibraryBundleImport with existing tracks', () => {
  it('reuses a track with the same Drive file and gives it no provenance', () => {
    const existing: DriveAudioSource = {
      ...SOPRANO,
      tags: ['Mine'],
      tagAddedAt: { Mine: AT },
    };
    const result = plan({ state: stateWith([existing]) });

    assert.equal(
      result.newSources.some((s) => s.driveFileId === 'd-sop' && !s.adjustment),
      false,
    );
    assert.equal(result.summary.reusedTracks, 1);
    assert.equal(
      result.loops
        .filter((l) => l.name === 'Entrance')
        .every((l) => l.sourceId === existing.id),
      true,
    );
    assert.equal(
      result.updatedSources.every((s) => s.importedFrom === undefined),
      true,
    );
  });

  it('merges tags and keeps what the user already has', () => {
    const existing: DriveAudioSource = {
      ...SOPRANO,
      tags: ['mine', 'Shared'],
      tagAddedAt: { mine: AT, Shared: AT },
      lyrics: { text: 'my words', updatedAt: AT, origin: 'typed' },
    };
    const bundle = fixtureBundle();

    bundle.sources[0].tags = ['shared', 'Messiah'];
    bundle.sources[0].lyrics = {
      text: 'their words',
      updatedAt: AT,
      origin: 'typed',
    };

    const [updated] = plan({
      bundle,
      state: stateWith([existing]),
    }).updatedSources;

    assert.deepEqual(updated.tags, ['mine', 'Shared', 'Messiah']);
    assert.equal(updated.tagAddedAt?.Messiah, IMPORTED_AT);
    assert.equal(updated.tagAddedAt?.mine, AT);
    assert.equal(updated.lyrics?.text, 'my words');
  });

  it('fills lyrics, sheet music and markers only where they are empty', () => {
    const bundle = fixtureBundle();

    bundle.sources[0].lyrics = {
      text: 'their words',
      updatedAt: AT,
      origin: 'typed',
    };
    bundle.sources[0].markers = [
      { id: 'm1', name: 'Entry', positionMs: 1000, createdAt: AT },
    ];

    const [updated] = plan({
      bundle,
      state: stateWith([SOPRANO]),
    }).updatedSources;

    assert.equal(updated.lyrics?.text, 'their words');
    assert.equal(updated.markers?.length, 1);
  });

  it('changes nothing when the bundle adds nothing', () => {
    assert.deepEqual(
      plan({ state: stateWith([SOPRANO, ALTO]) }).updatedSources,
      [],
    );
  });

  it('imports a track the user cannot open as needing access', () => {
    const result = plan({ needsAccessDriveFileIds: new Set(['d-alt']) });
    const alto = result.newSources.find((s) => s.driveFileId === 'd-alt');

    assert.deepEqual(alto?.availability.reason, 'needs-access');
    assert.equal(alto?.availability.status, 'unavailable');
    assert.equal(result.summary.needsAccessTracks, 1);
  });
});

describe('planLibraryBundleImport name conflicts and retries', () => {
  it('renames the import folder when the destination already has that name', () => {
    const state = emptyState();

    state.tree.folders.push({
      id: 'x',
      name: 'Imported library 2026-12-01',
      parentFolderId: ROOT,
      createdAt: AT,
    });

    assert.equal(
      plan({ state }).rootFolder.name,
      'Imported library 2026-12-01 Copy',
    );
  });

  it('keeps two imported siblings with the same name apart', () => {
    const bundle = fixtureBundle();

    bundle.folders.push({
      id: 'dup',
      name: bundle.folders[0].name,
      parentFolderId: bundle.folders[0].parentFolderId,
      createdAt: AT,
    });

    const names = plan({ bundle })
      .folders.filter(
        (f) => f.parentFolderId === plan({ bundle }).rootFolder.id,
      )
      .map((f) => f.name);

    assert.equal(new Set(names).size, names.length);
  });

  it('does not duplicate what a failed attempt already wrote', () => {
    const first = plan();
    const state = emptyState();

    state.entityCollections.sources = first.newSources.slice(0, 2);
    state.entityCollections.loops = first.loops;
    state.tree.folders.push(first.rootFolder, ...first.folders);
    state.tree.fileLinks.push(...first.fileLinks.slice(0, 3));

    const retry = plan({ state });

    assert.equal(retry.rootFolderExists, true);
    assert.equal(retry.folders.length, 0);
    assert.equal(retry.loops.length, 0);
    assert.equal(retry.fileLinks.length, first.fileLinks.length - 3);
    assert.equal(
      retry.newSources.length + retry.summary.reusedTracks >= 2,
      true,
    );
    // Every entity the retry would write is one the first attempt planned.
    const firstIds = new Set(
      [...first.newSources, ...first.playlists, ...first.composites].map(
        (e) => e.id,
      ),
    );

    assert.equal(
      [...retry.newSources, ...retry.playlists, ...retry.composites].every(
        (e) => firstIds.has(e.id),
      ),
      true,
    );
  });
});
