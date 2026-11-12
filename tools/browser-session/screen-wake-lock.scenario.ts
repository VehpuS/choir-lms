import assert from 'node:assert/strict';

import { buildMockLyrics } from '../../packages/mobile-rehearsal-player/src/test-support/mock-library/mock-library-entities';
import { buildMockSource } from '../../packages/mobile-rehearsal-player/src/test-support/mock-library/mock-library-fixtures';
import { readMediaState } from './media-probe';
import { buildToneMedia } from './mock-media';
import { waitForTrack, waitUntil } from './page-helpers';
import { runScenario } from './scenario-runner';

// web-platform-modernization 5.1: the screen stays on while a track plays and
// while lyrics are read, is let go when playback stops, and is asked for again
// after the page was hidden (the browser drops a wake lock then). The page
// gets a Screen Wake Lock that records its locks; nothing else is faked.
const WAIT_MS = 5000;
const TONE_SECONDS = 30;
const soprano = buildMockSource('Soprano Part', {
  durationMs: TONE_SECONDS * 1000,
  lyrics: buildMockLyrics('Kyrie eleison\nChriste eleison'),
});

// Plain script text: it runs in the page, where the test tooling's helpers do not exist.
const WAKE_LOCK_STUB = `
  (() => {
    window.__wakeLocks = [];
    window.__hidden = false;
    Object.defineProperty(document, 'visibilityState', { configurable: true, get: () => (window.__hidden ? 'hidden' : 'visible') });
    const wakeLock = {
      request: async (type) => {
        if (window.__hidden) throw new DOMException('hidden', 'NotAllowedError');
        const target = new EventTarget();
        const lock = { type, released: false, target };
        const sentinel = Object.assign(target, {
          type,
          get released() { return lock.released; },
          release: async () => { if (!lock.released) { lock.released = true; target.dispatchEvent(new Event('release')); } },
        });
        window.__wakeLocks.push(lock);
        return sentinel;
      },
    };
    Object.defineProperty(navigator, 'wakeLock', { configurable: true, get: () => wakeLock });
    // What a browser does: hiding the page drops every lock.
    window.__setHidden = (hidden) => {
      window.__hidden = hidden;
      if (hidden) window.__wakeLocks.forEach((lock) => lock.target.release && lock.target.release());
      document.dispatchEvent(new Event('visibilitychange'));
    };
  })();
`;

void runScenario({
  drive: {
    media: { [soprano.driveFileId]: buildToneMedia({ seconds: TONE_SECONDS }) },
    state: 'authorized',
  },
  library: { playlists: [], sources: [soprano] },
  mediaProbe: true,
  steps: async ({ page, pass }) => {
    await page.addInitScript(WAKE_LOCK_STUB);
    await page.reload();
    await waitForTrack(page, 'Soprano Part');

    const held = () =>
      page.evaluate<number>(
        'window.__wakeLocks.filter((lock) => !lock.released).length',
      );
    const requested = () => page.evaluate<number>('window.__wakeLocks.length');
    const expectHeld = (count: number, why: string) =>
      waitUntil(async () => (await held()) === count, why);

    assert.equal(await requested(), 0, 'a lock was taken with nothing playing');
    pass('No wake lock is taken while nothing plays');

    await page.getByLabel('Play Soprano Part').first().click();
    await waitUntil(
      async () => (await readMediaState(page))?.paused === false,
      'the track did not play',
    );
    await expectHeld(1, 'playing did not hold the screen awake');
    pass('Playing a track holds the screen awake');

    // The browser drops the lock when the page is hidden; showing it again asks again.
    await page.evaluate('window.__setHidden(true)');
    await expectHeld(0, 'hiding the page did not drop the lock');
    await page.evaluate('window.__setHidden(false)');
    await expectHeld(1, 'the lock was not asked for again on return');
    pass('The lock is asked for again when the page comes back');

    await page
      .getByLabel(/^Pause/)
      .first()
      .click();
    await expectHeld(0, 'pausing did not let the screen sleep');
    pass('Pausing lets the screen sleep');

    // Reading lyrics keeps it awake even while paused.
    await page.getByLabel(/^Now playing:/).click();
    await page.getByText('View', { exact: true }).click();
    await page.getByLabel('Close lyrics').waitFor({ timeout: WAIT_MS });
    await expectHeld(1, 'reading lyrics did not hold the screen awake');
    pass('Reading lyrics holds the screen awake while paused');

    await page.getByLabel('Close lyrics').click();
    await expectHeld(0, 'closing the lyrics did not let the screen sleep');
    pass('Closing the lyrics lets the screen sleep');
  },
});
