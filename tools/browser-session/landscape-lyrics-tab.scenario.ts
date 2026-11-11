import { buildMockLyrics } from '../../packages/mobile-rehearsal-player/src/test-support/mock-library/mock-library-entities';
import { buildMockSource } from '../../packages/mobile-rehearsal-player/src/test-support/mock-library/mock-library-fixtures';
import { readMediaState } from './media-probe';
import { buildToneMedia } from './mock-media';
import { waitForTrack, waitUntil } from './page-helpers';
import { WAIT_MS } from './piano-helpers';
import { settledBox } from './safe-area-helpers';
import { runScenario } from './scenario-runner';

// Device feedback after #65: the two-column playback view's Lyrics tab showed
// only the `LYRICS` header with Edit and View; the text was hidden, as it is on
// any short window, although the tab has the whole right column. The tab shows
// the lyrics, which scroll in the tab when they are long.
const LANDSCAPE = { height: 390, width: 844 };
const TONE_SECONDS = 30;
const LYRICS_LINES = Array.from(
  { length: 24 },
  (_, index) => `Line ${index + 1} of the song`,
);

const soprano = buildMockSource('Soprano Part', {
  durationMs: TONE_SECONDS * 1000,
  lyrics: buildMockLyrics(LYRICS_LINES.join('\n')),
});

void runScenario({
  drive: {
    media: { [soprano.driveFileId]: buildToneMedia({ seconds: TONE_SECONDS }) },
    state: 'authorized',
  },
  library: { playlists: [], sources: [soprano] },
  mediaProbe: true,
  steps: async ({ page, pass, shot }) => {
    await waitForTrack(page, 'Soprano Part');
    await page.getByLabel('Play Soprano Part').first().click();
    await waitUntil(
      async () => (await readMediaState(page))?.paused === false,
      'the track did not play',
    );
    await page.setViewportSize(LANDSCAPE);
    await page.getByTestId('now-playing-pane').waitFor({ timeout: WAIT_MS });
    await page.getByLabel(/^Now playing:/).click();

    const first = page.getByText(/^Line 1 of the song/);

    await first.waitFor({ timeout: WAIT_MS });
    const box = await settledBox(first);

    if (!box || box.x < LANDSCAPE.width / 2 || box.y > LANDSCAPE.height / 2) {
      throw new Error(
        `the lyrics are not in the right column (${JSON.stringify(box)})`,
      );
    }

    await shot('1-lyrics-tab');
    pass('The Lyrics tab shows the lyrics text in the right column');

    // Long lyrics scroll inside the tab, and View is still offered.
    await page.getByText('View', { exact: true }).waitFor({ timeout: WAIT_MS });
    const scrolled = await first.evaluate((element) => {
      let node: HTMLElement | null = element.parentElement;

      while (node && node.scrollHeight <= node.clientHeight + 1) {
        node = node.parentElement;
      }

      if (!node) {
        return false;
      }

      node.scrollTop = node.scrollHeight;

      return node.scrollTop > 0;
    });

    if (!scrolled) {
      throw new Error('long lyrics do not scroll inside the tab');
    }

    pass('Long lyrics scroll inside the tab and View is still offered');
  },
  viewport: LANDSCAPE,
});
