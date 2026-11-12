import assert from 'node:assert/strict';

import { buildMockSource } from '../../packages/mobile-rehearsal-player/src/test-support/mock-library/mock-library-fixtures';
import { waitForTrack } from './page-helpers';
import { runScenario } from './scenario-runner';

// web-platform-modernization 1.2b (F7): under forced colors (Windows High
// Contrast) a control reached by keyboard still shows a focus indicator. The
// browser drops box-shadow and background colour there, so the indicator has
// to be an outline (or a border). Walks the first Tab stops and fails on the
// ones with neither.
const TRACK = 'Soprano Part';
const TAB_STOPS = 8;

void runScenario({
  library: { playlists: [], sources: [buildMockSource(TRACK)] },
  steps: async ({ page, pass }) => {
    await waitForTrack(page, TRACK);
    await page.emulateMedia({ forcedColors: 'active' });
    assert.ok(
      await page.evaluate(
        () => window.matchMedia('(forced-colors: active)').matches,
      ),
      'forced colors did not switch on',
    );

    const missing: string[] = [];

    for (let stop = 0; stop < TAB_STOPS; stop += 1) {
      await page.keyboard.press('Tab');

      const indicator = await page.evaluate(() => {
        const element = document.activeElement;

        if (!element || element === document.body) {
          return null;
        }

        const style = getComputedStyle(element);

        return {
          label:
            element.getAttribute('aria-label') ??
            element.textContent?.trim().slice(0, 30) ??
            element.tagName,
          visible:
            (style.outlineStyle !== 'none' &&
              parseFloat(style.outlineWidth) > 0) ||
            (style.borderStyle !== 'none' &&
              parseFloat(style.borderTopWidth) > 0),
        };
      });

      if (indicator && !indicator.visible) {
        missing.push(indicator.label);
      }
    }

    assert.deepEqual(
      missing,
      [],
      `no outline or border on keyboard focus under forced colors: ${missing.join(', ')}`,
    );
    pass('Every keyboard stop shows an outline or border under forced colors');
  },
});
