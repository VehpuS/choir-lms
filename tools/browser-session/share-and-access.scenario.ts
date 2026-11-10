import { parseLibraryBundle } from '@org/audio-library-models';

import {
  buildMockFolder,
  buildMockSource,
  buildMockTrackCopy,
} from '../../packages/mobile-rehearsal-player/src/test-support/mock-library/mock-library-fixtures';
import { buildMockBundleFile } from './mock-bundles';
import { waitForTrack, waitUntil } from './page-helpers';
import { runScenario } from './scenario-runner';

// Sharing and the access guide. Share a folder: a bundle of its tracks is
// saved to "Choir LMS / Shares" for the user to share in Drive (no audio is
// copied). Import a bundle somebody shared: the preview warns about files the
// user cannot open, the import still goes ahead, and the access guide lists
// those files by owner until the owner shares them and "Check again" finds them.
const WAIT_MS = 5000;
const OWNER = { email: 'dana@example.test', name: 'Dana' };

const soprano = buildMockSource('Soprano Part');
const alto = buildMockSource('Alto Part');
const messiah = buildMockFolder('Messiah');

const runShare = () =>
  runScenario({
    drive: { state: 'authorized', writeAccess: true },
    library: {
      fileLinks: [
        buildMockTrackCopy(soprano, { folder: messiah }),
        buildMockTrackCopy(alto),
      ],
      folders: [messiah],
      playlists: [],
      sources: [soprano, alto],
    },
    steps: async ({ page, pass, session, shot }) => {
      await page
        .getByLabel('Messiah options')
        .first()
        .waitFor({ timeout: WAIT_MS });
      await page.getByLabel('Messiah options').first().click();
      await page.getByText('Share…', { exact: true }).click();
      await page.getByText('Share “Messiah”').waitFor({ timeout: WAIT_MS });
      await page
        .getByText('No audio is copied.', { exact: false })
        .waitFor({ timeout: WAIT_MS });
      await shot('1-share-sheet');
      pass(
        'Share opens a sheet that counts the folder and says no audio is copied',
      );

      await page.getByText('Save to Drive', { exact: true }).click();
      await page.getByText('Ready to share').waitFor({ timeout: WAIT_MS });
      await shot('2-ready-to-share');

      const shared = session.drive.store
        .list("trashed = false and name contains 'choir-lms-share-Messiah'")
        .find(() => true);

      if (!shared?.content) {
        throw new Error('the share file is not in Drive');
      }

      const parent = session.drive.store.get(shared.parents[0]);

      if (
        parent?.name !== 'Shares' ||
        shared.appProperties?.choirlmsBundle !== 'v1'
      ) {
        throw new Error('the share file is not marked and saved in Shares');
      }

      // Read back with the app's parser: only the folder's track, no audio bytes.
      const parsed = parseLibraryBundle(shared.content.toString('utf8'));

      if (
        parsed.status !== 'ok' ||
        parsed.bundle.scope.kind !== 'folder' ||
        parsed.bundle.sources.map(({ name }) => name).join() !== 'Soprano Part'
      ) {
        throw new Error('the share file does not hold just the Messiah folder');
      }

      pass(
        'Save to Drive writes a marked bundle of just that folder to Shares',
      );
    },
  });

const runImportShared = () => {
  // Dana's tracks, in a folder you were not given access to.
  const sharedSoprano = buildMockSource('Soprano Part', { owner: OWNER });
  const sharedAlto = buildMockSource('Alto Part', { owner: OWNER });
  const tenor = buildMockSource('Tenor Part');
  const bundle = buildMockBundleFile({
    author: OWNER,
    fileName: 'choir-lms-share-Messiah 2026-11-01T1000.json',
    library: { playlists: [], sources: [sharedSoprano, sharedAlto] },
    sharedWithMe: true,
  });

  return runScenario({
    drive: {
      files: [bundle.file],
      inaccessibleFileIds: [sharedSoprano.driveFileId, sharedAlto.driveFileId],
      media: { [bundle.id]: bundle.media },
      state: 'authorized',
      writeAccess: true,
    },
    library: { playlists: [], sources: [tenor] },
    steps: async ({ page, pass, session, shot }) => {
      await waitForTrack(page, 'Tenor Part');
      await page
        .getByLabel('Open Drive session menu')
        .filter({ visible: true })
        .click();
      await page.getByText('Import shared library', { exact: true }).click();
      await page
        .getByText('Dana · 1 Nov 2026, 10:00')
        .waitFor({ timeout: WAIT_MS });
      await shot('3-shared-list');
      pass('Import shared library lists what was shared with you, and by whom');

      await page.getByText('Messiah', { exact: true }).last().click();
      await page
        .getByText('2 files can’t be opened yet.')
        .waitFor({ timeout: WAIT_MS });
      await page
        .getByText('They’ll still be imported', { exact: false })
        .waitFor({ timeout: WAIT_MS });
      await shot('4-preview-needs-access');
      pass(
        'The preview warns that two files cannot be opened yet, and that they will still be imported',
      );

      await page.getByText('Choose where to add it', { exact: true }).click();
      await page.getByRole('button', { name: 'Add here' }).click();
      await page
        .getByText('2 files need access.')
        .waitFor({ timeout: WAIT_MS });
      await shot('5-import-result');
      pass('The import goes ahead and says how many files need access');

      // The access guide groups them by owner.
      await page
        .getByText('See which files need access', { exact: true })
        .click();
      await page
        .getByText('2 files need access', { exact: true })
        .waitFor({ timeout: WAIT_MS });
      await page.getByText(OWNER.email).waitFor({ timeout: WAIT_MS });
      // The sheet is last in the page; the library list behind has names too.
      await page
        .getByText('Alto Part', { exact: true })
        .last()
        .waitFor({ timeout: WAIT_MS });
      await page
        .getByText('Soprano Part', { exact: true })
        .last()
        .waitFor({ timeout: WAIT_MS });
      await shot('6-access-guide');
      pass('The access guide lists the files under their owner');

      // Copy list puts the owner and files on the clipboard.
      await page.getByText('Copy list', { exact: true }).click();
      await waitUntil(async () => {
        const text = await page.evaluate(() => navigator.clipboard.readText());

        return text.includes('Alto Part') && text.includes('Soprano Part');
      }, 'Copy list did not put the files on the clipboard');
      pass('Copy list copies the files that need access');

      // Check again: still closed until the owner shares them.
      await page.getByText('Check again', { exact: true }).click();
      await page
        .getByText('2 files need access', { exact: true })
        .waitFor({ timeout: WAIT_MS });
      pass(
        'Check again finds them still closed while access has not been given',
      );

      // The owner shares; Check again now finds them open.
      session.drive.inaccessible.clear();
      await page.getByText('Check again', { exact: true }).click();
      await page
        .getByText('2 files need access', { exact: true })
        .waitFor({ state: 'detached', timeout: WAIT_MS });
      await shot('7-access-given');
      pass(
        'After the owner shares them, Check again finds them open and the list clears',
      );
    },
  });
};

void (async () => {
  await runShare();
  await runImportShared();
})();
