import {
  buildMockLoop,
  withMockPlaylistItems,
} from '../../packages/mobile-rehearsal-player/src/test-support/mock-library/mock-library-entities';
import {
  buildMockPlaylist,
  buildMockSource,
  type MockLibrary,
} from '../../packages/mobile-rehearsal-player/src/test-support/mock-library/mock-library-fixtures';
import { buildMockBundleFile } from './mock-bundles';
import { waitForTrack, waitUntil } from './page-helpers';
import { runScenario } from './scenario-runner';

// Restore: a backup in Drive (a bundle generated with the runtime's builder)
// is previewed, then either added to the library in a new folder (nothing the
// user has changes) or used to replace the library (a backup of the current
// one is saved first, and can be restored to undo). Each step is checked on
// screen and in what the app saved and what it wrote to Drive.
const OWNER = 'local-device-user';
const SOURCES_KEY = `choirlms:practice:sources:${OWNER}`;
const LOOPS_KEY = `choirlms:practice:loops:${OWNER}`;
const PLAYLISTS_KEY = `choirlms:practice:playlists:${OWNER}`;
const TREE_KEY = `choirlms:practice:library-tree:${OWNER}`;
const WAIT_MS = 5000;
const FOLDER_MIME = 'application/vnd.google-apps.folder';
const BACKUP_LABEL = 'Backup · 1 Nov 2026, 10:00';

// On the device: Soprano and Tenor. In the backup: Soprano (the same Drive
// file), Alto, a loop and a playlist.
const soprano = buildMockSource('Soprano Part');
const alto = buildMockSource('Alto Part');
const tenor = buildMockSource('Tenor Part');
const entrance = buildMockLoop(soprano, 'Entrance');
const device: MockLibrary = { playlists: [], sources: [soprano, tenor] };
const backedUp: MockLibrary = {
  loops: [entrance],
  playlists: [
    withMockPlaylistItems(buildMockPlaylist('Sunday Set'), [
      { source: soprano },
      { loop: entrance, source: soprano },
    ]),
  ],
  sources: [soprano, alto],
};

const bundle = buildMockBundleFile({
  author: { name: 'Dana' },
  fileName: 'choir-lms-backup-2026-11-01T1000.json',
  folderId: 'folder-backups',
  library: backedUp,
});
const driveFiles = [
  { id: 'folder-root', mimeType: FOLDER_MIME, name: 'Choir LMS' },
  {
    id: 'folder-backups',
    mimeType: FOLDER_MIME,
    name: 'Backups',
    parents: ['folder-root'],
  },
  bundle.file,
];
const drive = {
  files: driveFiles,
  media: { [bundle.id]: bundle.media },
  state: 'authorized' as const,
  writeAccess: true,
};

type Named = { name: string };
type Tree = { folders: Named[] };

const startRestore = async (page: import('playwright').Page) => {
  await page
    .getByLabel('Open Drive session menu')
    .filter({ visible: true })
    .click();
  await page.getByText('Restore from backup', { exact: true }).click();
  await page.getByText(BACKUP_LABEL).waitFor({ timeout: WAIT_MS });
};

const runAdd = () =>
  runScenario({
    drive,
    library: device,
    steps: async ({ page, pass, session, shot }) => {
      const names = async (key: string) =>
        ((await session.readStored<Named[]>(key)) ?? [])
          .map(({ name }) => name)
          .sort();

      await waitForTrack(page, 'Soprano Part');
      await startRestore(page);
      await shot('1-backups-listed');
      await page
        .getByText('2 tracks · 1 loop · 1 playlist')
        .waitFor({ timeout: WAIT_MS });
      pass('Restore lists the backup with what it holds');

      // Preview: nothing is added until confirmed.
      await page.getByText(BACKUP_LABEL).click();
      await page.getByText('Add to my library', { exact: true }).click();
      await page.getByText('Continue', { exact: true }).click();
      await page
        .getByText('From Dana. Nothing is added until you confirm.')
        .waitFor({ timeout: WAIT_MS });
      await page.getByText('already yours').waitFor({ timeout: WAIT_MS });
      await shot('2-preview');
      if ((await names(SOURCES_KEY)).includes('Alto Part')) {
        throw new Error('the preview added a track before it was confirmed');
      }

      pass(
        'The preview shows the author and what is new, with nothing added yet',
      );

      // Confirm: into a new folder; the track already in the library is reused.
      await page.getByText('Choose where to add it', { exact: true }).click();
      await page
        .getByText('A new folder is created here.')
        .waitFor({ timeout: WAIT_MS });
      await page.getByRole('button', { name: 'Add here' }).click();
      await page.getByText('Import finished').waitFor({ timeout: WAIT_MS });
      await shot('3-added');

      await waitUntil(
        async () =>
          (await names(SOURCES_KEY)).join() ===
          'Alto Part,Soprano Part,Tenor Part',
        'the new track was not added, or the shared one was added twice',
      );
      if ((await names(LOOPS_KEY)).join() !== 'Entrance') {
        throw new Error('the loop was not added');
      }

      if ((await names(PLAYLISTS_KEY)).join() !== 'Sunday Set') {
        throw new Error('the playlist was not added');
      }

      const tree = await session.readStored<Tree>(TREE_KEY);

      if (
        !tree?.folders.some(({ name }) =>
          /^Imported library \d{4}-\d{2}-\d{2}$/.test(name),
        )
      ) {
        throw new Error('the import did not make its own folder');
      }

      const alto = (
        await session.readStored<
          { importedFrom?: { author?: string }; name: string }[]
        >(SOURCES_KEY)
      )?.find(({ name }) => name === 'Alto Part');

      if (alto?.importedFrom?.author !== 'Dana') {
        throw new Error('the added track does not say it came from Dana');
      }

      pass(
        'Add to my library adds the new track, loop and playlist in a new folder, reuses the track you had, and keeps what is yours',
      );
    },
  });

const runReplace = () =>
  runScenario({
    drive,
    library: device,
    steps: async ({ page, pass, session, shot }) => {
      const names = async (key: string) =>
        ((await session.readStored<Named[]>(key)) ?? [])
          .map(({ name }) => name)
          .sort();
      const backupFiles = () =>
        session.drive.store
          .list("trashed = false and 'folder-backups' in parents")
          .map((record) => record.name);

      await waitForTrack(page, 'Soprano Part');
      await startRestore(page);
      await page.getByText(BACKUP_LABEL).click();
      await page.getByText('Replace my library', { exact: true }).click();
      await page.getByText('Continue', { exact: true }).click();
      await page
        .getByText('Replace your library?')
        .waitFor({ timeout: WAIT_MS });
      await shot('4-replace-confirm');

      // Cancel changes nothing.
      await page.getByText('Cancel', { exact: true }).last().click();
      await page
        .getByText('Replace your library?')
        .waitFor({ state: 'detached', timeout: WAIT_MS });
      if ((await names(SOURCES_KEY)).join() !== 'Soprano Part,Tenor Part') {
        throw new Error('cancelling changed the library');
      }

      if (backupFiles().length !== 1) {
        throw new Error('cancelling wrote a backup to Drive');
      }

      pass('Cancelling the replace changes nothing and writes nothing');

      // Confirm: a backup of the current library first, then the replace.
      await startRestore(page);
      await page.getByText(BACKUP_LABEL).click();
      await page.getByText('Replace my library', { exact: true }).click();
      await page.getByText('Continue', { exact: true }).click();
      await page.getByRole('button', { name: 'Back up, then replace' }).click();
      await page.getByText('Library replaced').waitFor({ timeout: WAIT_MS });
      await shot('5-replaced');

      await waitUntil(
        async () =>
          (await names(SOURCES_KEY)).join() === 'Alto Part,Soprano Part',
        'the library is not the backup',
      );
      if ((await names(LOOPS_KEY)).join() !== 'Entrance') {
        throw new Error('the loop from the backup is missing');
      }

      const safety = backupFiles().find((name) =>
        name.startsWith('choir-lms-pre-restore-'),
      );

      if (!safety) {
        throw new Error('no backup of the previous library was saved first');
      }

      pass(
        'Replace saves a backup of the current library first, then the library becomes the backup',
      );

      // Undo: restoring that safety backup brings Tenor back.
      await page.getByText('Done', { exact: true }).click();
      await page
        .getByLabel('Open Drive session menu')
        .filter({ visible: true })
        .click();
      await page.getByText('Restore from backup', { exact: true }).click();
      await page
        .getByText(/Before restore|Restore point|pre-restore/i)
        .first()
        .click();
      await page.getByText('Replace my library', { exact: true }).click();
      await page.getByText('Continue', { exact: true }).click();
      await page.getByRole('button', { name: 'Back up, then replace' }).click();
      await page.getByText('Library replaced').waitFor({ timeout: WAIT_MS });
      await waitUntil(
        async () => (await names(SOURCES_KEY)).includes('Tenor Part'),
        'restoring the safety backup did not bring Tenor Part back',
      );
      pass(
        'Restoring the saved copy of the previous library undoes the replace',
      );
    },
  });

void (async () => {
  await runAdd();
  await runReplace();
})();
