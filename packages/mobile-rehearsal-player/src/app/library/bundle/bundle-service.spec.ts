import assert from 'node:assert/strict';
import { describe, it } from 'node:test';

import { buildLibraryBundle } from '@org/audio-library-runtime';

import { backUpLibrary } from './backup-library';
import { buildImportPreview, runImport } from './import-bundle';
import { listBundleChoices, readBundle } from './read-bundle';
import {
  buildReplacementState,
  replaceLibraryFromBundle,
} from './replace-library';
import { shareFolder, previewShare } from './share-folder';
import {
  AT,
  createFakeDependencies,
  libraryInput,
  recording,
} from './bundle-test-support';

const ownBundle = () => {
  const { bundle } = buildLibraryBundle({
    input: libraryInput(),
    scope: { kind: 'library' },
    author: { name: 'Dana' },
    createdAt: AT,
  });

  return bundle;
};

describe('backUpLibrary', () => {
  it('writes a marked, dated backup into Backups and then prunes', async () => {
    const { deps, log } = createFakeDependencies();
    const result = await backUpLibrary(deps);

    assert.equal(result.status, 'ok');
    assert.deepEqual(
      log.uploads.map((u) => [u.name, u.folderId]),
      [['choir-lms-backup-2026-11-09T1530.json', 'backups']],
    );
    assert.equal(result.status === 'ok' && result.removedBackups, 1);
    // The new backup is protected from its own pruning.
    assert.deepEqual(log.pruneCalls[0].protectedIds, ['file-1']);
  });

  it('records the Drive owner where Drive reported one', async () => {
    const { deps, log } = createFakeDependencies();

    await backUpLibrary(deps);

    const written = JSON.parse(log.uploads[0].json ?? '{}');

    assert.deepEqual(
      written.sources.find((s: { name: string }) => s.name === 'Alto').owner,
      { name: 'Ann', email: 'ann@example.com' },
    );
  });

  it('prunes nothing and says why when the write fails', async () => {
    const { deps, log } = createFakeDependencies({ failUpload: 'quota' });
    const result = await backUpLibrary(deps);

    assert.deepEqual(result, {
      status: 'failed',
      reason: 'quota',
      message: 'Drive is full, so nothing could be saved.',
    });
    assert.deepEqual(log.pruneCalls, []);
  });

  it('uploads the audio of a chosen recording first and references it, and leaves unchosen ones out', async () => {
    const { deps, log } = createFakeDependencies({
      recordings: [recording('rec-a'), recording('rec-b')],
    });

    await backUpLibrary(deps, { selectedRecordingIds: new Set(['rec-a']) });

    const written = JSON.parse(log.uploads[0].json ?? '{}');

    assert.equal(log.audio.length, 1);
    assert.equal(written.recordings.length, 1);
    assert.equal(written.recordings[0].audio.kind, 'drive');
    assert.equal(written.recordings[0].audio.fileName, log.audio[0]);
  });

  it('includes no recordings by default', async () => {
    const { deps, log } = createFakeDependencies({
      recordings: [recording('rec-a')],
    });

    await backUpLibrary(deps);

    assert.equal(JSON.parse(log.uploads[0].json ?? '{}').recordings, undefined);
    assert.deepEqual(log.audio, []);
  });
});

describe('replaceLibraryFromBundle', () => {
  it('backs up the current library with every recording before swapping once', async () => {
    const { deps, log, calls } = createFakeDependencies({
      recordings: [recording('rec-a'), recording('rec-b')],
    });
    const result = await replaceLibraryFromBundle(deps, {
      bundle: ownBundle(),
      bundleName: 'choir-lms-backup-x.json',
      isOwn: true,
    });

    assert.equal(result.status, 'ok');
    assert.equal(
      log.uploads[0].name,
      'choir-lms-pre-restore-2026-11-09T1530.json',
    );
    assert.equal(JSON.parse(log.uploads[0].json ?? '{}').recordings.length, 2);
    assert.equal(calls.replace.length, 1);
    assert.equal(calls.changed, 1);
    assert.deepEqual(result.status === 'ok' && result.removedSourceIds, [
      'gone',
    ]);
  });

  it('stops with the library untouched when the safety backup fails', async () => {
    const { deps, calls } = createFakeDependencies({ failUpload: 'offline' });
    const result = await replaceLibraryFromBundle(deps, {
      bundle: ownBundle(),
      bundleName: 'x.json',
      isOwn: true,
    });

    assert.equal(result.status, 'failed');
    assert.equal(result.status === 'failed' && result.libraryChanged, false);
    assert.deepEqual(calls.replace, []);
    assert.equal(calls.changed, 0);
  });

  it('builds a state whose top level sits at the library root, unmarked for an own backup', () => {
    const state = buildReplacementState({
      bundle: ownBundle(),
      bundleName: 'b.json',
      isOwn: true,
      ownerId: 'local-device-user',
      importedAt: AT,
    });
    const folderIds = new Set(state.tree.folders.map((f) => f.id));

    assert.equal(state.tree.rootFolderId, 'folder:library-root');
    assert.equal(state.tree.folders.length, 2);
    assert.equal(
      state.tree.fileLinks.every((l) => folderIds.has(l.parentFolderId)),
      true,
    );
    assert.equal(
      [...state.sources, ...state.loops, ...state.tree.folders].some(
        (e) => 'importedFrom' in e,
      ),
      false,
    );
  });

  it('keeps the Imported from marks when the bundle is someone else’s', () => {
    const state = buildReplacementState({
      bundle: ownBundle(),
      bundleName: 'b.json',
      isOwn: false,
      ownerId: 'local-device-user',
      importedAt: AT,
    });

    assert.equal(
      state.sources.every((s) => s.importedFrom?.author === 'Dana'),
      true,
    );
  });
});

describe('import preview and run', () => {
  it('probes only files the library does not have and flags the unreachable ones', async () => {
    const { deps } = createFakeDependencies({ needsAccess: ['d-new'] });
    const bundle = ownBundle();

    bundle.sources.push({
      id: 's9',
      driveFileId: 'd-new',
      name: 'New one',
      mimeType: 'audio/mpeg',
      createdAt: AT,
    });

    const preview = await buildImportPreview(deps, {
      bundle,
      bundleName: 'b.json',
      droppedTotal: 0,
    });

    assert.equal('plan' in preview, true);
    assert.deepEqual(
      'plan' in preview && [...preview.needsAccessDriveFileIds],
      ['d-new'],
    );
    assert.equal(
      'plan' in preview && preview.plan.summary.needsAccessTracks,
      1,
    );
    assert.equal('plan' in preview && preview.plan.summary.reusedTracks, 2);
  });

  it('never treats an undecided probe as needing access', async () => {
    const { deps } = createFakeDependencies({ unknownProbe: ['d-new'] });
    const bundle = ownBundle();

    bundle.sources.push({
      id: 's9',
      driveFileId: 'd-new',
      name: 'N',
      mimeType: 'audio/mpeg',
      createdAt: AT,
    });

    const preview = await buildImportPreview(deps, {
      bundle,
      bundleName: 'b.json',
      droppedTotal: 0,
    });

    assert.equal('plan' in preview && preview.needsAccessDriveFileIds.size, 0);
    assert.equal('plan' in preview && preview.accessUnchecked, true);
  });

  it('adds into the chosen destination and refreshes the library', async () => {
    const { deps, calls } = createFakeDependencies({
      input: { ...libraryInput(), sources: [], loops: [] },
    });
    const preview = await buildImportPreview(deps, {
      bundle: ownBundle(),
      bundleName: 'b.json',
      droppedTotal: 0,
    });

    assert.equal('plan' in preview, true);

    const run = await runImport(deps, {
      preview: preview as Exclude<typeof preview, { status: 'cancelled' }>,
      destinationFolderId: 'folder:messiah',
    });

    assert.equal(run.status, 'done');
    assert.equal(run.status === 'done' && run.result.status, 'completed');
    assert.equal(
      run.status === 'done' && run.plan.rootFolder.parentFolderId,
      'folder:messiah',
    );
    assert.equal(calls.changed, 1);
    assert.equal(calls.tree.length, 1);
  });
});

describe('share', () => {
  it('previews counts and what turning the outside choice on would add', async () => {
    const { deps } = createFakeDependencies();
    const preview = await previewShare(deps, 'folder:messiah');

    assert.deepEqual(preview.counts, {
      tracks: 2,
      loops: 1,
      playlists: 0,
      composites: 0,
      recordings: 0,
    });
    assert.equal(preview.folderName, 'Messiah');
    assert.equal(preview.outsideItemCount, 0);
  });

  it('writes a share into Shares named for the folder and gives the Drive link', async () => {
    const { deps, log } = createFakeDependencies();
    const result = await shareFolder(deps, {
      folderId: 'folder:messiah',
      folderName: 'Messiah',
      includeOutsideReferences: false,
    });

    assert.equal(result.status, 'ok');
    assert.equal(log.uploads[0].folderId, 'shares');
    assert.equal(
      log.uploads[0].name,
      'choir-lms-share-Messiah 2026-11-09T1530.json',
    );
    assert.equal(
      result.status === 'ok' && result.openUrl,
      'https://drive.google.com/file/d/file-1/view',
    );
    assert.deepEqual(log.pruneCalls, []);
  });
});

describe('reading bundles', () => {
  it('refuses text that is not a bundle and reports a failed list', async () => {
    const { deps } = createFakeDependencies({ readText: 'nope' });
    const listing = {
      id: 'x',
      name: 'x.json',
      origin: 'mine' as const,
      kind: 'backup' as const,
      marked: true,
    };
    const refused = await readBundle(deps, listing);

    assert.equal(refused.status, 'refused');

    const failing = createFakeDependencies({
      listing: { status: 'failed', reason: 'offline' },
    });

    assert.equal((await listBundleChoices(failing.deps)).status, 'failed');
  });

  it('reads a real bundle and says whether it is the user’s own', async () => {
    const { deps } = createFakeDependencies({
      readText: JSON.stringify(ownBundle()),
    });
    const listing = {
      id: 'x',
      name: 'x.json',
      origin: 'shared' as const,
      kind: 'share' as const,
      marked: true,
    };
    const read = await readBundle(deps, listing);

    assert.equal(read.status === 'ok' && read.isOwn, false);
    assert.equal(read.status === 'ok' && read.droppedTotal, 0);
  });
});
