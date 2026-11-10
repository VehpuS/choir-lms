import { parseLibraryBundle } from '@org/audio-library-models';

import {
  buildMockLoop,
  buildMockLyrics,
  buildMockMarker,
  withMockPlaylistItems,
  withMockTags,
} from '../../packages/mobile-rehearsal-player/src/test-support/mock-library/mock-library-entities';
import {
  buildMockPlaylist,
  buildMockSource,
  type MockLibrary,
} from '../../packages/mobile-rehearsal-player/src/test-support/mock-library/mock-library-fixtures';
import { waitForTrack, waitUntil } from './page-helpers';
import { runScenario } from './scenario-runner';

// Backup: from the Drive session menu, back up the library. The bundle lands
// in "Choir LMS / Backups" in Drive and is read back with the app's own bundle
// parser, so it stays in step with the code. Older backups beyond the last
// five are removed. Without the write permission the app asks first.
const WAIT_MS = 5000;
const KEPT_BACKUPS = 5;
const FOLDER_MIME = 'application/vnd.google-apps.folder';
const AUTH_TOKEN = 'mock-drive-access-token';

const alto = withMockTags(
  buildMockSource('Alto Part', {
    lyrics: buildMockLyrics('Kyrie eleison'),
    markers: [buildMockMarker('Verse', 12_000)],
  }),
  ['Mass'],
);
const tenor = buildMockSource('Tenor Part');
const trickyBars = buildMockLoop(alto, 'Tricky bars');
const library: MockLibrary = {
  loops: [trickyBars],
  playlists: [
    withMockPlaylistItems(buildMockPlaylist('Sunday Set'), [
      { source: alto },
      { loop: trickyBars, source: alto },
    ]),
  ],
  sources: [alto, tenor],
};

// Five earlier backups, already in Drive, oldest first.
const rootFolder = {
  id: 'folder-root',
  mimeType: FOLDER_MIME,
  name: 'Choir LMS',
};
const backupsFolder = {
  id: 'folder-backups',
  mimeType: FOLDER_MIME,
  name: 'Backups',
  parents: [rootFolder.id],
};
const sharesFolder = {
  id: 'folder-shares',
  mimeType: FOLDER_MIME,
  name: 'Shares',
  parents: [rootFolder.id],
};
const olderBackups = Array.from({ length: KEPT_BACKUPS }, (_, index) => ({
  appProperties: { choirlmsBundle: 'v1' },
  id: `older-backup-${index + 1}`,
  mimeType: 'application/json',
  modifiedTime: `2026-01-0${index + 1}T10:00:00.000Z`,
  name: `choir-lms-backup-2026-01-0${index + 1}T1000.json`,
  parents: [backupsFolder.id],
}));

const runWithWriteAccess = () =>
  runScenario({
    drive: {
      files: [rootFolder, backupsFolder, sharesFolder, ...olderBackups],
      state: 'authorized',
      writeAccess: true,
    },
    library,
    steps: async ({ page, pass, session, shot }) => {
      const backupsNow = () =>
        session.drive.store
          .list(`trashed = false and '${backupsFolder.id}' in parents`)
          .map((record) => record.name)
          .sort();

      await waitForTrack(page, 'Alto Part');
      await page
        .getByLabel('Open Drive session menu')
        .filter({ visible: true })
        .click();
      await page.getByText('Back up library', { exact: true }).click();
      await page
        .getByText('Saved to Drive in “Choir LMS / Backups”.')
        .waitFor({ timeout: WAIT_MS });

      // The sheet counts what will be saved.
      await page
        .getByText('tracks', { exact: true })
        .waitFor({ timeout: WAIT_MS });
      await shot('1-backup-sheet');
      pass('The backup sheet says where it saves and counts the library');

      await page.getByText('Back up', { exact: true }).last().click();
      await page.getByText('Backup saved').waitFor({ timeout: WAIT_MS });
      await shot('2-backed-up');

      // The new bundle is in Backups, marked as the app's, and the oldest of
      // the earlier backups was removed to keep five.
      await waitUntil(
        async () => backupsNow().length === KEPT_BACKUPS,
        'the backups folder does not hold the newest five',
      );

      const kept = backupsNow();

      if (kept.includes(olderBackups[0].name)) {
        throw new Error('the oldest backup was not removed');
      }

      const bundleRecord = session.drive.store
        .list(`trashed = false and '${backupsFolder.id}' in parents`)
        .find(({ id }) => !id.startsWith('older-backup-'));

      if (!bundleRecord?.content) {
        throw new Error('the new backup has no content in Drive');
      }

      if (bundleRecord.appProperties?.choirlmsBundle !== 'v1') {
        throw new Error('the new backup is not marked as a Choir LMS bundle');
      }

      pass(
        'The bundle is saved in Backups, marked, and only the newest five are kept',
      );

      // Read it back with the app's own parser: it holds the library, and no
      // sign-in secrets.
      const text = bundleRecord.content.toString('utf8');
      const parsed = parseLibraryBundle(text);

      if (parsed.status !== 'ok') {
        throw new Error('the backup is not a bundle the app can read');
      }

      const { bundle } = parsed;
      const names = bundle.sources.map(({ name }) => name).sort();

      if (names.join() !== 'Alto Part,Tenor Part') {
        throw new Error(`the bundle holds the tracks ${names.join()}`);
      }

      const altoInBundle = bundle.sources.find(
        ({ name }) => name === 'Alto Part',
      );

      if (
        altoInBundle?.lyrics?.text !== 'Kyrie eleison' ||
        altoInBundle.markers?.[0]?.name !== 'Verse' ||
        altoInBundle.tags?.join() !== 'Mass'
      ) {
        throw new Error('the bundle lost the track lyrics, markers or tags');
      }

      if (
        bundle.loops.map(({ name }) => name).join() !== 'Tricky bars' ||
        bundle.playlists[0]?.items.length !== 2
      ) {
        throw new Error('the bundle lost the loop or the playlist items');
      }

      if (text.includes(AUTH_TOKEN)) {
        throw new Error('the backup contains the Drive access token');
      }

      pass(
        'The backup reads back with the app’s parser: tracks, lyrics, markers, tags, loop, playlist',
      );
    },
  });

const runWithoutWriteAccess = () =>
  runScenario({
    drive: { state: 'authorized' },
    library,
    steps: async ({ page, pass, session, shot }) => {
      const writes = () =>
        session.drive.apiRequests.filter(
          (request) => !request.startsWith('GET'),
        );

      await waitForTrack(page, 'Alto Part');
      await page
        .getByLabel('Open Drive session menu')
        .filter({ visible: true })
        .click();
      await page.getByText('Back up library', { exact: true }).click();
      await page
        .getByText('Allow saving to Drive')
        .first()
        .waitFor({ timeout: WAIT_MS });
      await shot('3-needs-permission');

      // "Not now" closes it and writes nothing.
      await page.getByText('Not now', { exact: true }).click();
      await page
        .getByText('Allow saving to Drive')
        .first()
        .waitFor({ state: 'detached', timeout: WAIT_MS });
      if (writes().length > 0) {
        throw new Error('the app wrote to Drive without permission');
      }

      pass(
        'Without the write permission the app asks first, and Not now writes nothing',
      );

      // "Allow" goes to the sign-in page for the extra permission.
      await page
        .getByLabel('Open Drive session menu')
        .filter({ visible: true })
        .click();
      await page.getByText('Back up library', { exact: true }).click();
      await page
        .getByText('Allow saving to Drive')
        .first()
        .waitFor({ timeout: WAIT_MS });
      await page.getByRole('button', { name: 'Allow saving to Drive' }).click();
      await waitUntil(
        async () => session.drive.signInRequests.length > 0,
        'Allow did not start the Google sign-in',
      );
      pass('Allow starts the Google sign-in for the extra permission');
    },
  });

void (async () => {
  await runWithWriteAccess();
  await runWithoutWriteAccess();
})();
