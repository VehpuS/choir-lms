import { buildTrackRenameMockLibrary } from '../../packages/mobile-rehearsal-player/src/test-support/mock-library/mock-library-fixtures';
import {
  expectNoHorizontalOverflow,
  expectTabsInViewport,
  openTab,
  waitForTrack,
  type AppTab,
} from './page-helpers';
import { runScenario } from './scenario-runner';

// Shell navigation: the bottom tabs switch screens, Library remembers its
// chip and its Files folder while you are elsewhere, a reload starts again at
// the Library root with the saved library intact, and the layout holds at
// phone and desktop widths.
const WAIT_MS = 5000;
const TABS: AppTab[] = ['Library', 'Add', 'Recents'];
const PHONE = { height: 844, width: 390 };
const DESKTOP = { height: 800, width: 1280 };

const waitForText = (
  page: Parameters<typeof openTab>[0],
  text: string | RegExp,
) => page.getByText(text).first().waitFor({ timeout: WAIT_MS });

const pressChip = (page: Parameters<typeof openTab>[0], chip: string) =>
  page.getByText(chip, { exact: true }).first().click();

void runScenario({
  library: buildTrackRenameMockLibrary(),
  steps: async ({ page, pass, shot }) => {
    // Library opens on Files at the root, with the folders and tracks.
    await waitForTrack(page, 'Alto Part');
    await waitForText(page, 'Archive');
    await waitForText(page, 'Rehearsal');
    await shot('1-library-root');
    pass('Library opens on the Files root');

    // The other two tabs each show their own screen.
    await openTab(page, 'Add');
    await waitForText(page, 'My Drive');
    await shot('2-add');
    pass('Add shows the Drive browser');

    await openTab(page, 'Recents');
    await waitForText(page, 'Recent rehearsal entry points');
    await waitForText(page, '2 saved rehearsal tracks are ready');
    await shot('3-recents');
    pass('Recents shows the entry points and the saved track count');

    // Library keeps the chip it was on.
    await openTab(page, 'Library');
    await pressChip(page, 'Tracks');
    await waitForText(page, /saved rehearsal tracks \(2\)/i);
    await openTab(page, 'Add');
    await openTab(page, 'Library');
    await waitForText(page, /saved rehearsal tracks \(2\)/i);
    pass('Library keeps the Tracks chip across tab switches');

    // Files keeps its folder while you look at another chip.
    await pressChip(page, 'Files');
    await pressChip(page, 'Rehearsal');
    await waitForText(page, /current folder/i);
    await pressChip(page, 'Tracks');
    await pressChip(page, 'Files');
    await waitForText(page, 'Rehearsal');
    await page.getByText('Archive', { exact: true }).waitFor({
      state: 'detached',
      timeout: WAIT_MS,
    });
    await shot('4-files-folder-restored');
    pass('Files returns to the folder you left');

    // A reload starts again at the Library root; the library itself is kept.
    await page.reload();
    await waitForTrack(page, 'Alto Part');
    await waitForText(page, 'Archive');
    await waitForText(page, 'Rehearsal');
    pass('A reload starts at the Library root with the saved library intact');

    // Layout at both widths: no sideways scroll, every tab on screen.
    for (const [name, size] of [
      ['phone', PHONE],
      ['desktop', DESKTOP],
    ] as const) {
      await page.setViewportSize(size);
      await waitForTrack(page, 'Alto Part');
      await expectNoHorizontalOverflow(page);
      await expectTabsInViewport(page, TABS);
      await shot(`5-${name}-layout`);
      pass(`The layout holds at ${name} width (${size.width}px)`);
    }
  },
});
