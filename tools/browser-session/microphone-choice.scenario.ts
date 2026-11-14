import assert from 'node:assert/strict';

import type { Page } from 'playwright';

import { buildMockSource } from '../../packages/mobile-rehearsal-player/src/test-support/mock-library/mock-library-fixtures';
import { waitForTrack, waitUntil } from './page-helpers';
import { runScenario } from './scenario-runner';

// Choosing the microphone. The page gets two inputs (the browser's fake device
// stands behind both) and records what each capture asked for. Checks: the
// first start sees only a nameless placeholder input until a microphone was
// opened (an input is opened to learn the names), the prompt lists the inputs, a remembered
// input is opened without a prompt, Settings shows and changes the choice,
// Automatic means the system's choice, and an input that is gone falls
// back without an error and stays listed.
const alto = buildMockSource('Alto Part');
const WAIT_MS = 5000;
const MICROPHONE_CHOICE_KEY = 'choirlms.pitch.microphone-choice';

// Plain script text: it runs in the page, where the test tooling's helpers do not exist.
const TWO_INPUTS = `
  (() => {
    const devices = [
      { deviceId: 'phone', kind: 'audioinput', groupId: 'g1', label: 'iPhone Microphone' },
      { deviceId: 'buds', kind: 'audioinput', groupId: 'g2', label: 'Earbuds' },
    ];
    window.__inputs = devices.slice();
    window.__allowed = false;
    window.__captures = [];
    const media = navigator.mediaDevices;
    const getUserMedia = media.getUserMedia.bind(media);
    // Safari lists one placeholder input, with no id and no name, until a
    // microphone has been opened in the page; only then the real ones.
    media.enumerateDevices = async () =>
      window.__allowed
        ? window.__inputs.map((device) => ({ ...device }))
        : [{ deviceId: '', kind: 'audioinput', groupId: '', label: '' }];
    media.getUserMedia = async (constraints) => {
      const audio = constraints && constraints.audio;
      window.__captures.push(
        audio === true
          ? { probe: true }
          : { probe: false, deviceId: (audio && audio.deviceId && audio.deviceId.ideal) || null },
      );
      window.__allowed = true;
      return getUserMedia({ audio: true });
    };
  })();
`;

// The prompt can open at once and cover the sheet, so closing is best effort;
// `closeTools` closes whatever is still open once the prompt is answered.
const toolSwitch = async (page: Page, name: string, state: 'on' | 'off') => {
  await page.getByLabel('Practice tools', { exact: true }).click();
  await page.getByLabel(`${name}, ${state === 'on' ? 'off' : 'on'}`).click();
  await page.getByLabel(`${name}, ${state}`).waitFor({ timeout: WAIT_MS });
  await page
    .getByLabel('Close practice tools')
    .first()
    .click({ timeout: state === 'on' ? 1500 : WAIT_MS })
    .catch((error: unknown) => {
      if (state === 'off') {
        throw error;
      }
    });
};

const closeTools = async (page: Page) => {
  const close = page.getByLabel('Close practice tools').first();

  // The sheet may already be on its way out, in which case there is nothing to click.
  await close.click({ timeout: 2000 }).catch(() => undefined);
};

const openMicrophoneSettings = async (page: Page) => {
  await page.getByLabel('Open Drive session menu').first().click();
  await page.getByText('Settings', { exact: true }).click();
  await page.getByText('Microphone', { exact: true }).first().click();
  await page
    .getByLabel('Ask each time', { exact: true })
    .waitFor({ timeout: WAIT_MS });
};

void runScenario({
  library: { playlists: [], sources: [alto] },
  microphone: true,
  microphoneChoice: 'ask',
  requires: ['chromium'],
  steps: async ({ page, pass, session, shot }) => {
    await page.addInitScript(TWO_INPUTS);
    await page.reload();
    await waitForTrack(page, 'Alto Part').catch(() => undefined);

    const captures = () =>
      page.evaluate<Array<{ deviceId?: string | null; probe: boolean }>>(
        'window.__captures',
      );
    const prompt = page.getByLabel('Which microphone?', { exact: true });
    const listening = page.getByText('Listening', { exact: false }).first();

    // First start: names are hidden, so one capture opens the system input to
    // learn them, then the prompt lists both inputs.
    await toolSwitch(page, 'Pitch detection', 'on');
    await prompt.waitFor({ timeout: WAIT_MS });
    assert.ok(
      (await captures()).some((capture) => capture.probe),
      'no input was opened to learn the names',
    );
    await page.getByLabel('iPhone Microphone', { exact: true }).waitFor();
    await page.getByLabel('Earbuds', { exact: true }).waitFor();
    await shot('1-prompt');
    pass('The first start asks which microphone, listing both by name');

    // Automatic is selected to begin with: Continue uses the system's choice,
    // once, and remembers nothing without the checkbox.
    await page.getByLabel('Continue').click();
    await closeTools(page);
    await listening.waitFor({ timeout: WAIT_MS });
    const afterDismiss = (await captures()).at(-1);
    assert.equal(afterDismiss?.deviceId, null, 'Automatic asked for an input');
    assert.equal(
      await page.evaluate(
        `window.localStorage.getItem('${MICROPHONE_CHOICE_KEY}')`,
      ),
      null,
      'continuing without the checkbox remembered a choice',
    );
    pass(
      'Continuing on Automatic uses the system choice and remembers nothing',
    );

    // Choose the earbuds and remember: the prompt is not shown again.
    await toolSwitch(page, 'Pitch detection', 'off');
    await toolSwitch(page, 'Pitch detection', 'on');
    await prompt.waitFor({ timeout: WAIT_MS });
    await page.getByLabel('Earbuds', { exact: true }).click();
    await page.getByLabel('Remember my choice').click();
    await page.getByLabel('Continue').click();
    await closeTools(page);
    await listening.waitFor({ timeout: WAIT_MS });
    assert.equal((await captures()).at(-1)?.deviceId, 'buds');
    pass('The chosen input is the one opened');

    await toolSwitch(page, 'Pitch detection', 'off');
    await toolSwitch(page, 'Pitch detection', 'on');
    await closeTools(page);
    await listening.waitFor({ timeout: WAIT_MS });
    assert.equal(await prompt.count(), 0, 'a remembered choice asked again');
    assert.equal((await captures()).at(-1)?.deviceId, 'buds');
    pass('A remembered input is opened without asking');

    // Settings shows it, and Ask each time brings the prompt back.
    await toolSwitch(page, 'Pitch detection', 'off');
    await openMicrophoneSettings(page);
    await waitUntil(
      async () =>
        (await page
          .getByLabel('Earbuds', { exact: true })
          .getAttribute('aria-checked')) === 'true',
      'Settings did not show the remembered input as selected',
    );
    await shot('2-settings');
    await page.getByLabel('Ask each time', { exact: true }).click();
    await page.waitForFunction(
      (key) => window.localStorage.getItem(key) === null,
      MICROPHONE_CHOICE_KEY,
      { timeout: WAIT_MS },
    );
    pass('Settings shows the remembered input and Ask each time clears it');

    // An input that is gone: remember it, unplug it, start again.
    await page.getByLabel('Earbuds', { exact: true }).click();
    await page.waitForFunction(
      (key) => (window.localStorage.getItem(key) ?? '').includes('buds'),
      MICROPHONE_CHOICE_KEY,
      { timeout: WAIT_MS },
    );
    await page.evaluate(
      "window.__inputs = window.__inputs.filter((device) => device.deviceId !== 'buds'); navigator.mediaDevices.dispatchEvent(new Event('devicechange'))",
    );
    await page
      .getByLabel('Earbuds (not connected)', { exact: true })
      .waitFor({ timeout: WAIT_MS });
    pass('Settings keeps a remembered input that is not connected');

    await page.getByLabel('Close settings').first().click();
    await toolSwitch(page, 'Pitch detection', 'on');
    await closeTools(page);
    await listening.waitFor({ timeout: WAIT_MS });
    assert.equal(await prompt.count(), 0);
    assert.equal(
      (await captures()).at(-1)?.deviceId,
      null,
      'an unplugged input was asked for',
    );
    pass('An input that is gone falls back to the system choice without error');
    void session;
  },
});
