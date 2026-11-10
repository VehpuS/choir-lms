import { mkdirSync } from 'node:fs';
import { join } from 'node:path';

import { buildDefaultMockLibrary } from '../../packages/mobile-rehearsal-player/src/test-support/mock-library/mock-library-fixtures';
import { openMockLibrarySession } from './mock-library-session';

// Live check for issue #36: adding a track to a playlist shows a success
// snackbar. Usage (after `nx run mobile-rehearsal-player:build`):
//   npx tsx tools/browser-session/add-to-playlist-snackbar.scenario.ts <outDir>
const SNACKBAR_TIMEOUT_MS = 5000;

const main = async () => {
  const outDir = process.argv[2] ?? 'browser-session-output';

  mkdirSync(outDir, { recursive: true });

  const session = await openMockLibrarySession({
    library: buildDefaultMockLibrary(),
  });
  const { page } = session;
  const openPicker = async (trackName: string) => {
    await page.getByLabel(`${trackName} options`).first().click();
    await page.getByText('Add to playlist').click();
  };
  const shot = (name: string) => page.screenshot({ path: join(outDir, name) });
  const results: string[] = [];

  try {
    await page.getByLabel('Alto Part options').first().waitFor();
    await shot('1-library.png');

    // Existing playlist.
    await openPicker('Alto Part');
    await shot('2-picker.png');
    await page.getByText('Sunday Set', { exact: true }).last().click();
    await page
      .getByText('Alto Part was added to Sunday Set.')
      .waitFor({ timeout: SNACKBAR_TIMEOUT_MS });
    await page.getByText('Added to playlist').waitFor();
    await shot('3-snackbar-existing-playlist.png');
    results.push('PASS existing playlist snackbar');

    // New playlist created from the picker.
    await openPicker('Tenor Part');
    await page.getByText(/New playlist/).click();
    await page.getByRole('textbox').fill('Concert');
    await shot('4-create-playlist.png');
    await page.getByText('Create', { exact: true }).click();
    await page
      .getByText('Tenor Part is the first item in Concert.')
      .waitFor({ timeout: SNACKBAR_TIMEOUT_MS });
    await shot('5-snackbar-new-playlist.png');
    results.push('PASS new playlist snackbar');
  } catch (error) {
    await shot('failure.png');
    results.push(`FAIL ${(error as Error).message.split('\n')[0]}`);
    process.exitCode = 1;
  } finally {
    console.log(results.join('\n'));
    await session.close();
  }
};

void main();
