import assert from 'node:assert/strict';

import { buildMockSource } from '../../packages/mobile-rehearsal-player/src/test-support/mock-library/mock-library-fixtures';
import { readMediaState } from './media-probe';
import { buildToneMedia } from './mock-media';
import { waitForTrack, waitUntil } from './page-helpers';
import { runScenario } from './scenario-runner';

// web-platform-modernization 5.2: the browser is told what is playing, so the
// lock screen, the notification shade and the media keys show it and drive
// it. The page's real Media Session is used; its action handlers and position
// state are recorded so the scenario can press the "remote" buttons.
const TONE_SECONDS = 30;
const alto = buildMockSource('Alto Part', { durationMs: TONE_SECONDS * 1000 });

// Plain script text: it runs in the page, where the test tooling's helpers do not exist.
const MEDIA_SESSION_RECORDER = `
  (() => {
    window.__mediaHandlers = {};
    window.__positionStates = [];
    const session = navigator.mediaSession;
    const setActionHandler = session.setActionHandler.bind(session);
    session.setActionHandler = (action, handler) => {
      window.__mediaHandlers[action] = handler;
      setActionHandler(action, handler);
    };
    const setPositionState = session.setPositionState.bind(session);
    session.setPositionState = (state) => {
      window.__positionStates.push(state ? { ...state } : null);
      setPositionState(state);
    };
  })();
`;

void runScenario({
  drive: {
    media: { [alto.driveFileId]: buildToneMedia({ seconds: TONE_SECONDS }) },
    state: 'authorized',
  },
  library: { playlists: [], sources: [alto] },
  mediaProbe: true,
  requires: ['chromium'],
  steps: async ({ page, pass }) => {
    await page.addInitScript(MEDIA_SESSION_RECORDER);
    await page.reload();
    await waitForTrack(page, 'Alto Part');

    const sessionState = () =>
      page.evaluate<{ artwork: number; state: string; title: string | null }>(
        `({
          artwork: navigator.mediaSession.metadata?.artwork.length ?? 0,
          state: navigator.mediaSession.playbackState,
          title: navigator.mediaSession.metadata?.title ?? null,
        })`,
      );
    const press = (action: string) =>
      page.evaluate(`window.__mediaHandlers[${JSON.stringify(action)}]()`);

    assert.equal((await sessionState()).title, null);
    pass('Nothing is announced while nothing plays');

    await page.getByLabel('Play Alto Part').first().click();
    await waitUntil(
      async () => (await readMediaState(page))?.paused === false,
      'the track did not play',
    );
    await waitUntil(
      async () => (await sessionState()).state === 'playing',
      'the browser was not told playback started',
    );

    const announced = await sessionState();

    assert.equal(announced.title, 'Alto Part');
    assert.ok(announced.artwork >= 2, 'the notification has no artwork');
    pass('The browser is told the title, the artwork and that it is playing');

    await waitUntil(
      async () =>
        (
          await page.evaluate<{ duration: number }[]>('window.__positionStates')
        ).some((state) => state?.duration > 0),
      'the scrubber position was not reported',
    );
    const states = await page.evaluate<
      ({ duration: number; playbackRate: number } | null)[]
    >('window.__positionStates');
    const reported = states.find((state) => state && state.duration > 0);

    assert.ok(
      reported && Math.abs(reported.duration - TONE_SECONDS) < 1,
      `reported length ${reported?.duration}, expected about ${TONE_SECONDS}`,
    );
    assert.equal(reported.playbackRate, 1);
    pass('The scrubber gets the track length and speed');

    await press('pause');
    await waitUntil(
      async () => (await readMediaState(page))?.paused === true,
      'the lock screen pause did not pause the track',
    );
    await waitUntil(
      async () => (await sessionState()).state === 'paused',
      'the browser was not told playback paused',
    );
    pass('Pause from the lock screen pauses, and the state follows');

    await press('play');
    await waitUntil(
      async () => (await readMediaState(page))?.paused === false,
      'the lock screen play did not resume the track',
    );
    pass('Play from the lock screen resumes');

    for (const action of ['play', 'pause', 'nexttrack', 'previoustrack']) {
      assert.ok(
        await page.evaluate(
          `typeof window.__mediaHandlers.${action} === 'function'`,
        ),
        `no ${action} handler is registered`,
      );
    }
    pass('Play, pause, next and previous are all wired');
  },
});
