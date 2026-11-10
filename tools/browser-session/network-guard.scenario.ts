import { buildDefaultMockLibrary } from '../../packages/mobile-rehearsal-player/src/test-support/mock-library/mock-library-fixtures';
import { runScenario } from './scenario-runner';

// Proves the offline guard: a request to an undeclared host is blocked and
// recorded, and the scenario would fail on it unless it is expected.
const UNMOCKED_URL = 'https://unmocked.example.test/track.mp3';

void runScenario({
  library: buildDefaultMockLibrary(),
  steps: async ({ page, pass, session }) => {
    await page.getByLabel('Alto Part options').first().waitFor();

    const reached = await page.evaluate(
      (url) =>
        fetch(url).then(
          () => 'reached',
          () => 'blocked',
        ),
      UNMOCKED_URL,
    );

    if (reached !== 'blocked') {
      throw new Error('the unmocked request was not blocked');
    }

    pass('an unmocked external request is blocked');

    let failed = false;

    try {
      session.assertNoBlockedRequests();
    } catch (error) {
      failed = (error as Error).message.includes(UNMOCKED_URL);
    }

    if (!failed) {
      throw new Error('the guard did not report the blocked request');
    }

    pass('the guard reports the URL');

    // Consume it so this proof scenario itself passes.
    session.expectBlockedRequest('unmocked.example.test');
    pass('an expected blocked request is consumed');
  },
});
