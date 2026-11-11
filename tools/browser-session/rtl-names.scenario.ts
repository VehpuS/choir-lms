import type { Page } from 'playwright';

import { withMockPlaylistItems } from '../../packages/mobile-rehearsal-player/src/test-support/mock-library/mock-library-entities';
import {
  buildMockPlaylist,
  buildMockSource,
} from '../../packages/mobile-rehearsal-player/src/test-support/mock-library/mock-library-fixtures';
import { readMediaState } from './media-probe';
import { buildToneMedia } from './mock-media';
import { waitForTrack, waitUntil } from './page-helpers';
import { runScenario } from './scenario-runner';

// Issue #46, follow-up F.1: a playlist named in Hebrew made the playback
// sheet's line (`<name> · 1 of 2`) a right-to-left paragraph: right-aligned,
// with the position to the left of the name. The name must keep its own
// direction while the line stays left-to-right: the name first, then the
// position, with the line starting at the left of its box.
const PLAYLIST_NAME = 'אור-פנד-לנד-2026-12-09';
const POSITION = '1 of 2';
const TONE_SECONDS = 30;
const WAIT_MS = 5000;

const alto = buildMockSource('Alto Part', { durationMs: TONE_SECONDS * 1000 });
const soprano = buildMockSource('Soprano Part', {
  durationMs: TONE_SECONDS * 1000,
});
const playlist = withMockPlaylistItems(buildMockPlaylist(PLAYLIST_NAME), [
  { source: alto },
  { source: soprano },
]);
const tone = buildToneMedia({ seconds: TONE_SECONDS });

type LineLayout = {
  boxLeft: number;
  textLeft: number;
  nameLeft: number;
  nameRight: number;
  positionLeft: number;
};

// Where the name and the position sit on screen, for every visible line that
// shows both, so a reordered line shows up as the position left of the name.
const readLineLayouts = (page: Page): Promise<LineLayout[]> =>
  page.evaluate(
    ([name, position]) => {
      const layouts: LineLayout[] = [];
      const walker = document.createTreeWalker(
        document.body,
        NodeFilter.SHOW_TEXT,
      );

      for (let node = walker.nextNode(); node; node = walker.nextNode()) {
        const text = node.textContent ?? '';
        const nameAt = text.indexOf(name);
        const positionAt = text.indexOf(position);
        const box = node.parentElement?.getBoundingClientRect();

        if (nameAt < 0 || positionAt < 0 || !box || box.width === 0) {
          continue;
        }

        // Written out (no nested named function): esbuild would add a helper
        // the page does not have.
        const nameRange = document.createRange();
        const positionRange = document.createRange();

        nameRange.setStart(node, nameAt);
        nameRange.setEnd(node, nameAt + name.length);
        positionRange.setStart(node, positionAt);
        positionRange.setEnd(node, positionAt + position.length);

        // A line that wraps has one rect per fragment: the name's extent is
        // the whole of it, the position's start is its first fragment.
        const nameBox = nameRange.getBoundingClientRect();
        const positionBox = positionRange.getClientRects()[0];

        // The leftmost point of the text: at the box's left edge when the line
        // is left-aligned, well inside it when it is right-aligned.
        const wholeRange = document.createRange();

        wholeRange.selectNodeContents(node);

        let textLeft = Infinity;

        for (const rect of Array.from(wholeRange.getClientRects())) {
          textLeft = Math.min(textLeft, rect.left);
        }

        layouts.push({
          boxLeft: box.left,
          textLeft,
          nameLeft: nameBox.left,
          nameRight: nameBox.right,
          positionLeft: positionBox.left,
        });
      }

      return layouts;
    },
    [PLAYLIST_NAME, POSITION],
  );

void runScenario({
  drive: {
    media: {
      [alto.driveFileId]: tone,
      [soprano.driveFileId]: tone,
    },
    state: 'authorized',
  },
  library: { playlists: [playlist], sources: [alto, soprano] },
  mediaProbe: true,
  steps: async ({ page, pass, shot }) => {
    await waitForTrack(page, 'Alto Part');
    await page.getByText('Playlists', { exact: true }).first().click();
    await page.getByText(PLAYLIST_NAME, { exact: true }).first().click();
    await page.getByText('Ordered', { exact: true }).first().click();
    await waitUntil(async () => {
      const state = await readMediaState(page);

      return state !== null && !state.paused;
    }, 'the playlist did not start playing');
    await page.getByLabel(/^Now playing:/).click();
    await page.getByLabel('Dismiss playback').waitFor({ timeout: WAIT_MS });
    await waitUntil(
      async () => (await readLineLayouts(page)).length > 0,
      'the playlist line did not show',
    );
    await shot('1-playback-sheet');

    for (const layout of await readLineLayouts(page)) {
      if (layout.positionLeft < layout.nameRight) {
        throw new Error(
          `the position (x ${Math.round(layout.positionLeft)}) is left of the name (x ${Math.round(layout.nameLeft)}..${Math.round(layout.nameRight)}): the line reads right to left`,
        );
      }

      if (layout.textLeft - layout.boxLeft > 1) {
        throw new Error(
          `the line starts ${Math.round(layout.textLeft - layout.boxLeft)}px from the left of its box: it is right-aligned`,
        );
      }
    }

    pass('A Hebrew playlist name keeps its line left-to-right in the sheet');
  },
});
