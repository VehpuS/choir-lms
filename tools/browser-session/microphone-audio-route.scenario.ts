import assert from 'node:assert/strict';

import type { Page } from 'playwright';

import { buildMockSource } from '../../packages/mobile-rehearsal-player/src/test-support/mock-library/mock-library-fixtures';
import { waitForTrack, waitUntil } from './page-helpers';
import { runScenario } from './scenario-runner';

// The experimental "Sound while listening" setting (Settings > Microphone):
// what the page asks iOS for while the microphone is open. The page gets a
// recorder in place of `navigator.audioSession` (no cutting: this checks what
// is asked for, not what iOS does) and each route is tried in turn.
const alto = buildMockSource('Alto Part');
const WAIT_MS = 5000;

// Plain script text: it runs in the page, where the test tooling's helpers do not exist.
const AUDIO_SESSION_RECORDER = `
  (() => {
    let type = 'auto';
    window.__sessionTypes = [];
    Object.defineProperty(navigator, 'audioSession', {
      configurable: true,
      value: {
        get type() { return type; },
        set type(next) { type = next; window.__sessionTypes.push(next); },
      },
    });
  })();
`;

const ROUTES = [
  { label: 'Play and record (default)', expected: 'play-and-record' },
  { label: 'Automatic (the browser decides)', expected: 'auto' },
  { label: 'Playback once the microphone is on', expected: 'playback' },
] as const;

const openSettingsAndChoose = async (page: Page, label: string) => {
  await page.getByLabel('Open Drive session menu').first().click();
  await page.getByText('Settings', { exact: true }).click();
  await page.getByText('Microphone', { exact: true }).first().click();
  await page.getByLabel(label, { exact: true }).click();
  await page.waitForTimeout(300);
  await page.getByLabel('Close settings').first().click();
};

const switchPitch = async (page: Page, state: 'on' | 'off') => {
  await page.getByLabel('Practice tools', { exact: true }).click();
  await page
    .getByLabel(`Pitch detection, ${state === 'on' ? 'off' : 'on'}`)
    .click();
  await page
    .getByLabel(`Pitch detection, ${state}`)
    .waitFor({ timeout: WAIT_MS });
  await page
    .getByLabel('Close practice tools')
    .first()
    .click({ timeout: WAIT_MS });
};

void runScenario({
  library: { playlists: [], sources: [alto] },
  microphone: true,
  requires: ['chromium'],
  steps: async ({ page, pass }) => {
    await page.addInitScript(AUDIO_SESSION_RECORDER);
    await page.reload();
    await waitForTrack(page, 'Alto Part').catch(() => undefined);

    const listening = page.getByText('Listening', { exact: false }).first();
    const sessionType = () =>
      page.evaluate<string>('navigator.audioSession.type');

    for (const route of ROUTES) {
      await openSettingsAndChoose(page, route.label);
      await switchPitch(page, 'on');
      await listening.waitFor({ timeout: WAIT_MS });
      await waitUntil(
        async () => (await sessionType()) === route.expected,
        `route "${route.label}": the session never became "${route.expected}"`,
      );
      pass(
        `${route.label}: the session is "${route.expected}" while listening`,
      );

      await switchPitch(page, 'off');
      await waitUntil(
        async () => (await sessionType()) === 'auto',
        `route "${route.label}": the previous session type did not come back`,
      );
      pass(`${route.label}: the previous session type returns afterwards`);
    }

    assert.ok(
      (await page.evaluate<string[]>('window.__sessionTypes')).includes(
        'play-and-record',
      ),
    );
  },
});
