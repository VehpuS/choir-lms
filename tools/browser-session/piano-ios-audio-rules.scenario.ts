import assert from 'node:assert/strict';

import { buildMockSource } from '../../packages/mobile-rehearsal-player/src/test-support/mock-library/mock-library-fixtures';
import { waitForTrack } from './page-helpers';
import {
  C4_HZ,
  WAIT_MS,
  expectTone,
  holdKey,
  openPiano,
} from './piano-helpers';
import { runScenario } from './scenario-runner';

// The piano under the audio rules iOS Safari applies, which Chromium does not:
//  - a new AudioContext starts suspended and `resume()` only counts when it is
//    called synchronously inside a qualifying gesture (touchend, pointerup,
//    click, keydown), not later and not from a touch's pointerdown;
//  - Web Audio alone follows the silent switch, so a page has to ask for the
//    "playback" audio session (`navigator.audioSession`) or the piano is silent
//    until some media element happens to play (why it worked during playback).
// The page gets a stand-in for both; real iPhones still need a hand check.
const alto = buildMockSource('Alto Part');

// Plain script text: it runs in the page, where the test tooling's helpers do not exist.
const IOS_RULES = `
  (() => {
    // A gesture is "open" from the moment a qualifying event starts travelling
    // until it has bubbled to the window, so only synchronous handlers see it.
    let inGesture = false;
    ['touchend', 'pointerup', 'click', 'keydown'].forEach((type) => {
      window.addEventListener(type, () => { inGesture = true; }, true);
      window.addEventListener(type, () => { inGesture = false; }, false);
    });
    window.__resumeCalls = [];
    const resume = AudioContext.prototype.resume;
    AudioContext.prototype.resume = function () {
      window.__resumeCalls.push(inGesture);
      return inGesture ? resume.call(this) : new Promise(() => {});
    };
    // A context made outside a gesture starts suspended, as on iOS.
    const suspend = AudioContext.prototype.suspend;
    const OriginalContext = window.AudioContext;
    window.AudioContext = class extends OriginalContext {
      constructor(...args) { super(...args); suspend.call(this); }
    };
    // The audio session: records what the page asks for.
    window.__audioSessionTypes = [];
    let type = 'auto';
    Object.defineProperty(navigator, 'audioSession', {
      configurable: true,
      value: {
        get type() { return type; },
        set type(next) { type = next; window.__audioSessionTypes.push(next); },
      },
    });
  })();
`;

void runScenario({
  audioTap: true,
  library: { playlists: [], sources: [alto] },
  requires: ['chromium'],
  steps: async ({ page, pass, session }) => {
    await page.addInitScript(IOS_RULES);
    await page.reload();
    await waitForTrack(page, 'Alto Part').catch(() => undefined);
    await openPiano(page);

    const sessionType = () =>
      page.evaluate<string>('navigator.audioSession.type');

    assert.equal(
      await sessionType(),
      'playback',
      'the piano did not ask for the playback audio session, so on an iPhone its sound follows the silent switch',
    );
    pass('Opening the piano asks for the playback audio session');

    // The first key after launch, with the context still suspended: the key
    // press itself is not a gesture iOS accepts, the lift is.
    await holdKey(page, session, 'C4', async () => undefined);
    await expectTone(session, C4_HZ, 'the first key on a fresh launch');
    const resumes = await page.evaluate<boolean[]>('window.__resumeCalls');

    assert.ok(
      resumes.includes(true),
      'the context was never resumed from inside a qualifying gesture',
    );
    pass(
      'The first key on a fresh launch is heard under the iOS gesture rules',
    );

    // Closing the piano gives the audio session back.
    await page.getByLabel('Practice tools', { exact: true }).click();
    await page.getByLabel('Piano, on').click();
    await page.getByLabel('Piano, off').waitFor({ timeout: WAIT_MS });
    await page.getByLabel('Close practice tools').first().click();
    assert.notEqual(
      await sessionType(),
      'playback',
      'closing the piano left the page holding the playback audio session',
    );
    pass('Closing the piano gives the audio session back');
  },
});
