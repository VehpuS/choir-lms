---
name: browser-test-coverage
description: >
  Add, extend or run the automated browser scenarios for the mobile rehearsal
  player (`tools/browser-session/`). Use when a task changes user-visible web
  behavior, reports a browser bug to reproduce first, mentions Playwright
  scenarios, `browser-test`, mock Drive, the fake microphone, audio quality
  checks, or asks whether a flow has browser coverage.
---

# Browser Test Coverage

The browser suite drives the real Expo web export in Chromium against a mock
library, a mock Google Drive, generated audio and a fake microphone, with no
network. Read `tools/browser-session/README.md` first: it lists every helper and
what each existing scenario covers. For the design, see
`openspec/changes/broad-browser-tests/design.md`.

## When to use it

- **Bug report in the browser:** reproduce it as a failing scenario first, fix
  the code, keep the scenario as the regression test.
- **New or changed user-visible behavior:** add or extend a scenario in the same
  change (testing policy: same-slice coverage). Unit and component specs still
  come first for pure logic; the scenario covers the flow a user sees.
- **"Is this covered?":** search the README list and `*.scenario.ts` names
  before answering.

## Workflow

1. Pick the nearest scenario in `tools/browser-session/` and copy its shape:
   `runScenario({ drive, library, mediaProbe, microphone, steps })`. One file per
   area and behavior: `<area>-<behavior>.scenario.ts`.
2. Seed with builders, not inline objects: `buildMockSource`, `buildMockLoop`,
   `withMockPlaylistItems`, `withMockTags`, `buildMockMarker`, `buildMockLyrics`,
   `buildMockComposite`, `buildMockRecording` (in `src/test-support/mock-library/`).
3. Serve audio with `buildToneMedia({ seconds })` (Drive `media` or `webFiles`);
   scores and PDFs through `webFiles`. Anything the app fetches must be declared:
   the network guard fails the scenario on an undeclared host.
4. Locate by `getByLabel` / role / visible text; add an `accessibilityLabel` to the
   app only when no stable accessible name exists. Never invent test ids.
5. Assert what the user sees **and** what the app saved (`session.readStored`,
   `readRecordedAudio`, `session.drive.store`). Call `pass('...')` per behavior and
   `shot('n-name')` at key states.
6. Wait for conditions (`waitUntil`, `waitFor`, `waitForTrack`), never fixed
   sleeps, except to let a render settle after a state you already asserted.
   Poll for lazily drawn content (scores fill in progressively).

## Run

```sh
npm exec -- nx run mobile-rehearsal-player:build-browser-test   # once per app change
npx tsx tools/browser-session/run-scenarios.ts browser-session-output --scenario=<text>
npm exec -- nx run mobile-rehearsal-player:browser-test         # the default lane, as CI runs it
npm exec -- nx run mobile-rehearsal-player:browser-test-matrix  # slow lane (device profiles, CPU, sample rates)
```

A failure writes `failure.png`, `failure-trace.zip` (`npx playwright show-trace`)
and `failure-console.txt` to the output folder. Run a new scenario several times
before committing; a flaky scenario is worse than none.

## Lanes and limits

- A scenario that takes more than a few seconds, or needs a quiet CPU, is named
  `*.matrix.scenario.ts` and runs in the opt-in matrix lane.
- Chromium only on every PR. WebKit is on demand; a scenario that needs a
  Chromium-only feature (fake microphone, CPU throttling) declares it so it is
  skipped, not failed, elsewhere.
- Emulation does not reproduce real iOS/Android audio or native playback; say so
  rather than claiming coverage.

## Park, don't chase

A bug or oddity met while writing a scenario is recorded as a follow-up in the
active OpenSpec `tasks.md` (see the deliberate execution rules), not fixed in the
scenario's slice.

## Related

- `mobile-web-runtime-debugging` for live debugging of browser-only failures.
- `.github/instructions/testing-policy.instructions.md` for the overall policy.
