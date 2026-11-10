import { buildDefaultMockLibrary } from '../../packages/mobile-rehearsal-player/src/test-support/mock-library/mock-library-fixtures';
import {
  chooseMenuItem,
  expectToast,
  openTrackMenu,
  waitForTrack,
} from './page-helpers';
import { runScenario } from './scenario-runner';

// Live check for issue #36: adding a track to a playlist shows a success
// snackbar, both for an existing playlist and for one created from the picker.
const openPicker = async (
  page: Parameters<typeof openTrackMenu>[0],
  trackName: string,
) => {
  await openTrackMenu(page, trackName);
  await page.getByText('Add to playlist').click();
};

void runScenario({
  library: buildDefaultMockLibrary(),
  steps: async ({ page, pass, shot }) => {
    await waitForTrack(page, 'Alto Part');
    await shot('1-library');

    // Existing playlist.
    await openPicker(page, 'Alto Part');
    await shot('2-picker');
    await chooseMenuItem(page, 'Sunday Set');
    await expectToast(page, 'Alto Part was added to Sunday Set.');
    await page.getByText('Added to playlist').waitFor();
    await shot('3-snackbar-existing-playlist');
    pass('existing playlist snackbar');

    // New playlist created from the picker.
    await openPicker(page, 'Tenor Part');
    await page.getByText(/New playlist/).click();
    await page.getByRole('textbox').fill('Concert');
    await shot('4-create-playlist');
    await page.getByText('Create', { exact: true }).click();
    await expectToast(page, 'Tenor Part is the first item in Concert.');
    await shot('5-snackbar-new-playlist');
    pass('new playlist snackbar');
  },
});
