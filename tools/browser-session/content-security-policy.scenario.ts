import assert from 'node:assert/strict';

import { buildMockSource } from '../../packages/mobile-rehearsal-player/src/test-support/mock-library/mock-library-fixtures';
import { waitForTrack, waitUntil } from './page-helpers';
import { runScenario } from './scenario-runner';

// web-platform-modernization 4.3 (F10): the page carries a policy that stops
// injected script. Every scenario already fails on a violation (`runScenario`
// checks), which proves the app works under it; this one proves the policy
// blocks what it is for: an inline script, an eval, and a script from another
// origin. The violations are caused on purpose and claimed.
const track = buildMockSource('Soprano Part');

// Plain script text: it runs in the page, where the test tooling's helpers do not exist.
const TRY_INJECTIONS = `
  (() => {
    window.__injected = { eval: false, inline: false, external: false };
    const inline = document.createElement('script');
    inline.textContent = 'window.__injected.inline = true';
    document.head.appendChild(inline);
    // A string timer is evaluated later, under the page's policy. window.eval, called
    // here, would run inside the test tool's own evaluation, which the
    // browser exempts from the eval check.
    window.setTimeout('window.__injected.eval = true', 0);
    const external = document.createElement('script');
    external.src = 'https://scripts.example.test/injected.js';
    document.head.appendChild(external);
  })();
`;

void runScenario({
  library: { playlists: [], sources: [track] },
  steps: async ({ page, pass, session }) => {
    await waitForTrack(page, 'Soprano Part');

    const policy = await page
      .locator('meta[http-equiv="Content-Security-Policy"]')
      .getAttribute('content', { timeout: 2000 });

    assert.ok(policy, 'the page has no Content-Security-Policy meta tag');
    assert.match(policy, /object-src 'none'/);
    assert.doesNotMatch(policy, /script-src[^;]*'unsafe-(inline|eval)'/);
    pass('The policy forbids unsafe-inline and unsafe-eval scripts');

    await page.evaluate(TRY_INJECTIONS);
    // Each refused injection is reported by the browser; wait for the string
    // timer's (it fires after a task) and claim all three.
    await waitUntil(async () => {
      try {
        session.expectCspViolation('|eval|');

        return true;
      } catch {
        return false;
      }
    }, 'the browser did not refuse the string timer');
    session.expectCspViolation('|inline|');
    session.expectCspViolation('scripts.example.test');
    pass(
      'The browser refused the inline script, the eval and the other-origin script',
    );

    const injected = await page.evaluate<{
      eval: boolean;
      inline: boolean;
    }>('window.__injected');

    assert.equal(injected.inline, false, 'an inline script ran');
    assert.equal(injected.eval, false, 'eval ran');
    pass('None of the injected code ran');
  },
});
